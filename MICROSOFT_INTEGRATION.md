# Microsoft 365 Integration — Research & Design Notes

> Status: **research only. No code changed.** This is a decision document for the TL
> before any implementation. Goal: store project/task documents in users' Microsoft
> 365 space (OneDrive / Teams) and optionally surface notifications in Teams/Outlook,
> via the **Microsoft Graph API**.

---

## 1. Untangle "Teams / Outlook / user's own space"

These are **different storage buckets**. Picking the wrong one builds the wrong thing.

| Where | What it actually is | "User's own space"? |
|---|---|---|
| **OneDrive for Business** | Each user's personal M365 cloud drive | ✅ **Yes — this is "their own space"** |
| **Teams Files** | A channel's *Files* tab = a **SharePoint** document library | ❌ Shared team space |
| **SharePoint site** | Shared doc libraries for a team/project | ❌ Shared |
| **Outlook** | Email + calendar. Attachments live *in messages*, not a file store | ❌ Not document storage |

Key truth: **OneDrive, Teams Files, and SharePoint all sit on the same storage engine.**
Graph exposes them identically as `drive` + `driveItem`. One API, different drive IDs.
Outlook is a separate surface (mail/calendar) and is **not** a document store.

- "Store in the **user's own space**" → **OneDrive for Business** (delegated).
- "Store in **Teams**" → that channel's **SharePoint** library (shared).
- "Integrate **Outlook**" → realistically means **notifications**: email a doc link
  (`/sendMail`) or put deadlines on their calendar. Not storage.

---

## 2. How Graph storage works (the model)

Everything is `GET/PUT /drives/{drive-id}/items/{item-id}` — same verbs for OneDrive,
Teams, or SharePoint; only the target drive differs.

- **Small file (≤ 4 MB):** single `PUT …/content`
- **Large file:** create an **upload session**, PUT byte ranges (< 60 MiB per chunk).
  Max file size **250 GB**.
- **Sharing:** `POST …/createLink` or `…/permissions` → share links.
- **Change notifications:** Graph **subscriptions (webhooks)** push file-change events
  to a backend endpoint — can feed our existing notification system.

---

## 3. The core decision: auth model

Graph can act in two ways. This choice drives the whole design.

### A. Delegated — app acts *as the signed-in user*
User logs in with their Microsoft account → consents → backend gets a token scoped to
that user. Uploads land in `/me/drive` (their OneDrive).

**Pros**
- True "their own space" — file **owned by the user**, their quota, their permissions.
- **Least privilege**: app can never exceed the user's own rights — small blast radius.
- Minimal admin trust (often just user consent).
- Offboarding follows normal M365 lifecycle (their account).

**Cons**
- Every user must **sign in with Microsoft once** (OAuth) → build the flow + store refresh tokens.
- Token lifecycle: access ~1 hr, refresh tokens expire/revoke → must handle refresh.
- Background jobs harder — Celery can only act "as the user" with a stored valid refresh token.
- May need **On-Behalf-Of (OBO)** to exchange the frontend token for a Graph token.

### B. Application — app acts *as itself* (service identity)
Client-credentials (client ID + secret/cert). Tenant admin grants app-level scopes
(e.g. `Files.ReadWrite.All`). Targets `/users/{id}/drive` or a SharePoint site.

**Pros**
- **No per-user login** — clean for server-side/automated uploads (Celery-friendly).
- Stable: one credential, no refresh-token juggling.
- Good for a **shared** Teams/SharePoint library.

**Cons**
- `Files.ReadWrite.All` = app can touch **everyone's** files tenant-wide → **huge blast radius**;
  a leaked secret is catastrophic.
- Requires **tenant admin consent** — IT must approve broad permissions.
- Files **owned by the app**, not the user — contradicts "their own space."
- Scope it with **`Sites.Selected`** (specific sites only) — never blanket `.All`.

### Verdict
- "User's own space" → **Delegated → OneDrive**. Safer + matches the literal ask.
- "Shared project space in Teams" → **Application + `Sites.Selected`** (scoped), not `.All`.
- **Avoid app-wide `Files.ReadWrite.All`.**

---

## 4. Integration architecture options

### Option A — Delegated, files in each user's OneDrive
Per-user "Connect Microsoft" → OAuth → store **encrypted** refresh token (reuse the
existing Fernet box, `app/core/crypto.py`). On attach, upload to their OneDrive, save the
returned link / item ID.
- ✅ Personal ownership, least privilege.
- ❌ Per-user consent + token management.

### Option B — Application + `Sites.Selected`, files in a Teams/SharePoint project library
One service credential, admin-consented to specific sites. Map each app Project ↔ a
SharePoint library / Teams channel. Server-side uploads.
- ✅ No user login, Celery-friendly, mirrors "Teams Files."
- ❌ Shared (not personal) ownership; admin setup; project→site mapping.

### Option C — Hybrid / link-only (recommended first step)
Don't store bytes. User **picks a file** from OneDrive/Teams (Graph file picker); we store
only **link + metadata**.
- ✅ No upload pipeline, no large-file sessions, M365 owns the bytes.
- ❌ Link rot if moved/deleted; viewing needs M365 access.

---

## 5. How this maps onto the existing codebase

### `Attachment` model today (`app/models/task.py`)
```
Attachment: id, file_name, file_url (String 500), uploaded_at, task_id
```
Today `file_url` is just a string the user pastes. All three options slot in here.

**Proposed (NOT YET IMPLEMENTED) columns to add when we build:**
| Column | Why |
|---|---|
| `storage_provider` (str: `local` / `onedrive` / `sharepoint`) | Distinguish source |
| `external_item_id` (str) | Graph `driveItem` id — re-fetch / refresh links |
| `external_drive_id` (str) | Which drive it lives in |
| `web_url` (str) | Graph share/preview link (rename of/alongside `file_url`) |
| `owner_user_id` (FK users) | Whose OneDrive it lives in (Option A) |

Option C needs only `storage_provider` + `web_url` + `external_item_id`. Minimal migration.

### Where Microsoft auth/tokens would live (Option A)
- New table e.g. `ms_credentials`: `user_id`, `refresh_token` (**Fernet-encrypted**),
  `expires_at`, `scope`. Mirror the encrypt-at-rest pattern already used for request secrets.
- New endpoints (sketch): `GET /integrations/microsoft/connect` (start OAuth),
  `GET /integrations/microsoft/callback` (store token), `POST /tasks/{id}/attachments/onedrive`
  (upload). All additive; no change to existing flows.

### Celery fit
- **Large uploads** (>4 MB → upload sessions, chunked) → run in a Celery task, not in the
  request. We already have Celery + Redis wired.
- **Delegated background uploads** need a valid stored refresh token; the worker refreshes
  the access token before each Graph call.
- **Webhook renewal**: Graph subscriptions expire (max ~3 days for many resources) → a
  **Celery beat** job renews them. Same beat we already run.

### Notifications (ties to existing `NotificationService`)
- Graph file-change webhook → FastAPI endpoint → `NotificationService.create_many(...)`
  to ping watchers when a doc changes. Reuses current notification fan-out.
- **Teams notifications**: post task/project updates to a Teams channel via Graph
  `chatMessage`, or simpler **Incoming Webhook / Adaptive Card**.
- **Outlook notifications**: `/sendMail` to email a doc link, or create calendar events for
  task deadlines. This is the realistic "Outlook integration" — not storage.

---

## 6. Technical facts worth knowing

- **One API for all targets** — OneDrive / Teams Files / SharePoint are all `drive`/`driveItem`.
- **Upload**: ≤ 4 MB single PUT; larger → upload session, < 60 MiB chunks, up to 250 GB.
- **Delegated scopes**: `Files.ReadWrite` (user's own). App-wide is `Files.ReadWrite.All`
  (avoid) or scoped `Sites.Selected`.
- **Subscriptions (webhooks)** push change events → pair with our notification system.
- **Send mail / calendar**: Graph `/sendMail`, `/events` for the Outlook angle.

---

## 7. Costs / gotchas

- **Licensing**: users need M365 plans that include OneDrive/SharePoint (most business plans do).
  Work/school accounts behave differently from personal MSAccounts.
- **App registration** in Entra ID (Azure AD) — IT owns this; admin consent for any `.All` scope.
- **Secrets**: client secret/cert must be guarded (encrypt-at-rest already exists).
- **Token storage** (delegated): encrypted refresh tokens per user (reuse Fernet).
- **Tenant lock**: register the app **single-tenant** (appxcess only) unless multi-tenant is intended.
- **Throttling**: Graph rate-limits; large rollouts need retry/backoff (Celery handles this).
- **Webhook endpoint** must be a **public HTTPS URL** Graph can reach (matters once deployed to cloud).

---

## 8. Decisions the TL must make (blocking)

1. **Personal vs shared** storage?
   - "User's own space" → OneDrive (delegated, Option A).
   - "Team/project space" → Teams/SharePoint (application + `Sites.Selected`, Option B).
2. **Store bytes vs store links?** (Option C is far cheaper to build — recommended first.)
3. **Outlook = notifications, not storage** — confirm understood.
4. Will **IT / Entra admin** grant the app registration + consent? *This blocks everything — start here.*
5. Are all testers on **work/school M365 accounts** in the appxcess tenant?

---

## 9. Recommendation

1. **Phase 1 — Option C (file-picker + link).** Ships fast, no upload/token machinery,
   M365 owns the bytes. Adds 2–3 columns to `Attachment`.
2. **Phase 2 — Option A (delegated → OneDrive)** if the app should own the upload UX.
   Adds the OAuth flow + encrypted token store + Celery chunked uploads.
3. **Notifications**: add Teams Adaptive Card + Outlook `/sendMail` on top of the existing
   `NotificationService` whenever desired — independent of the storage choice.
4. **Never** use app-wide `Files.ReadWrite.All`. Prefer delegated, or `Sites.Selected`.

---

## Sources

- [OneDrive/SharePoint selected permissions overview](https://learn.microsoft.com/en-us/graph/permissions-selected-overview)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Working with files in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0)
- [Upload small files (PUT content)](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0)
- [Teams/SharePoint 250 GB file limit](https://sto.care/blog/microsoft-teams-file-limit/)
