# Implementation Plan — PM Tool Enhancements

Scope: 10 feature requests. This document maps each to the current codebase, proposes a
concrete backend + frontend change set, and lists pros / cons / risks. File:line references
point at the real code so estimates are grounded.

**Stack reminder:** FastAPI + async SQLAlchemy (asyncpg/Postgres) + Alembic, Next.js (App Router)
+ React Query + Zustand, RBAC roles `admin > manager > member`.

---

## 0. Cross-cutting foundations (build first — several features depend on these)

Three of the requests (5, 8, 9) all need the same missing concept: **explicit project membership
and many-to-many project↔team links**. Today `Project` has only a single `team_id` and an
`owner_id` (`app/models/project.py:12-33`). Build this once, reuse everywhere.

### F0.1 — Project membership + multi-team
New association tables in `app/models/base.py`:
- `project_members` (`project_id`, `user_id`, optional `role_in_project`)
- `project_teams` (`project_id`, `team_id`)

`Project` gains relationships `members: list[User]` and `teams: list[Team]`. Keep the existing
`team_id`/`owner_id` for backward compatibility (treat `team_id` as the "primary team") or migrate
it into `project_teams` and drop the column. Recommended: **keep `team_id` nullable, add the link
tables, backfill** so nothing breaks.

### F0.2 — Generic assignment helper
A reusable service method `assign_members(entity, user_ids)` pattern (already exists in spirit in
`TaskService._users_by_ids`, `app/service/task.py:16-27`). Generalize so projects, goals, and tasks
all share the same eager-loaded user resolution.

**Migration:** one Alembic revision adding `project_members`, `project_teams` (+ backfill from
`team_id`).

| Pros | Cons |
|------|------|
| Unblocks 3 features with one schema change | Touches the central `Project` model — needs careful eager-loading to avoid `MissingGreenlet` on serialization |
| Matches how Jira/Linear actually model membership | Backfill + nullable migration must be tested against existing data |

---

## 1. Task- and project-scoped automation / notifications

**Current state**
- `AutomationRule` is project-scoped (`project_id` nullable = global), trigger→action engine,
  evaluated synchronously inside `TaskService.update_task` → `AutomationService.evaluate`
  (`app/service/automation.py:45-77`, called at `app/service/task.py:221`).
- The `notify` action already targets assignees + watchers + reporter.
- There is **no per-task opt-in**; automation only fires if an admin/manager authored a rule.

**Proposed**
1. Add `notify_on_update: bool` column to `Task` (a checkbox in the task UI). When true, **any**
   field change notifies all assignees + watchers automatically — no rule authoring needed.
2. Add a lightweight **project subscription**: reuse `project_members` (F0.1). On any task create/
   update or project update, notify the project's members (filtered, see Feature 8).
3. Keep the existing rule engine for advanced cases.

**Backend**
- Migration: `tasks.notify_on_update BOOLEAN DEFAULT false`.
- `TaskService.update_task`: after computing `changed_fields`, if `db_task.notify_on_update`, call
  `NotificationService.create_many(...)` for assignees ∪ watchers (dedup already handled,
  `app/service/notification.py`).
- New `ProjectService.notify_members(project, message, link)` helper.

**Frontend**
- `TaskDetailModal.tsx`: add a "Notify members on every update" toggle next to the existing
  `requires_approval` toggle (lines 235-247).
- Optional: a per-project "Notifications" settings card to toggle project-wide subscription.

| Pros | Cons |
|------|------|
| Builds on an engine that already exists and is wired in | Synchronous notification creation grows the update transaction; consider moving to Celery if volume rises |
| Per-task checkbox is intuitive, no rule config needed | Risk of notification spam — needs the Feature-8 filtering to be usable |

---

## 2. Secure the secret sent in a Request response (admin → member) + auto-expiry

**Scope clarification:** this is about the **credential an admin types into a Request response** — e.g.
a member opens a "API Key" request, the admin replies with the actual key. Today that secret lands in
`AdminRequest.response_content` (`app/models/request.py:14-27`) as **plaintext**, is returned in the
`GET /requests/` payload, and stays visible **forever** in the member's "History"
(`requests/page.tsx` response display). This is the leak to fix — *not* the repo `access_token`.

**Current state**
- `AdminRequest.response_content` is a plaintext `Text` column, persisted indefinitely.
- It is serialized in every `GET /api/requests/` response (admin sees all, member sees their own,
  `app/router/request.py` / `RequestService.get_user_requests`).
- The member's History panel renders it in the clear on every page load, indefinitely.

> **Correctness note for the TL:** "hash" the key won't work here either — the **member has to read
> the real key** to use it, so a one-way hash destroys it. The right approach is **encryption at rest
> + controlled disclosure + auto-expiry/scrub**: store ciphertext, decrypt only when the authorized
> requester views it, mask it in the list, and make it disappear after the admin-specified number of
> days (or after a one-time reveal).

**Proposed**
1. Add a `Fernet` key to settings (`app/core/config`), helper `encrypt()/decrypt()` in
   `app/core/security.py` (next to the bcrypt helpers).
2. Encrypt `response_content` when the admin responds; store ciphertext, never plaintext.
3. **Do not return the secret in the list endpoint.** `GET /requests/` returns only
   `has_response: bool` + masked placeholder. The real value comes from a dedicated, audited
   endpoint `GET /requests/{id}/reveal` that:
   - authorizes (only the requesting member or an admin),
   - decrypts and returns the value,
   - records the reveal (and optionally one-time-only: scrub after first reveal).
4. Add `secret_expires_at: datetime | null`. When responding, admin picks "visible for N days".
   A Celery beat job (project already runs beat) **nulls `response_content`** past expiry so the
   secret physically disappears from the DB; the member then sees "expired — request again".

**Backend**
- Migration: add `secret_expires_at` (+ optional `revealed_at`); data-migrate existing plaintext
  responses to ciphertext (or null them if treated as already-expired).
- `RequestService.respond_to_request`: encrypt before store; set `secret_expires_at = now + N days`.
- `RequestService.get_*`: strip `response_content`, expose `has_response` only.
- New `GET /requests/{id}/reveal` endpoint (authz + decrypt + audit/scrub).
- New Celery task `expire_request_secrets` (mirror `app/job/tasks/...`).

**Frontend**
- Admin respond form (`requests/page.tsx`): add "Secret visible for (days)" input.
- Member History: show a masked secret with a **"Reveal" button** (calls `/reveal`), a copy button,
  and an expiry countdown ("disappears in 3 days"); after expiry show "expired".

| Pros | Cons |
|------|------|
| Stops indefinite plaintext storage + plaintext-in-every-list-response of real credentials | Fernet key must live in env/secret store, not code; rotating it means re-encrypting rows |
| Auto-expiry/scrub + reveal-on-demand limits exposure window and DB blast radius | Reversible by design — a one-time-reveal-then-scrub is stronger if the member only needs it once |
| Reuses the existing Celery beat for expiry, same pattern as everything else | Slightly more flow (reveal endpoint) than just printing the value |

---

## 3. Request category → dropdown + visible timestamp

**Current state**
- `AdminRequest` has **no `category` column** (`app/models/request.py:14-27`); the frontend reuses
  the `title` field labelled "Category" as a free-text input (`requests/page.tsx:75-81`).
- `created_at`/`updated_at` already exist and are shown via `toLocaleDateString` (`page.tsx:136`).

**Proposed**
1. Add a real `category` column (String or a small enum: `ACCESS`, `HARDWARE`, `LEAVE`,
   `API_KEY`, `OTHER` — confirm the list with the TL).
2. Frontend: replace the text input with a `<select>`; keep `title`/`description` separate.
3. Improve timestamp display (date + time, relative "2h ago").

**Backend**
- Migration: `admin_requests.category VARCHAR` (+ enum if fixed set).
- Update `RequestCreate`/`RequestResponse` schemas + service.

**Frontend**
- `requests/page.tsx`: category dropdown, show `created_at` with time.

| Pros | Cons |
|------|------|
| Smallest, self-contained change — good quick win | Category taxonomy needs sign-off; enum changes later need a migration |

---

## 4. Select team + specific members during task creation

**Current state**
- Create-task modal collects only `title`, `description`, `project_id`, `priority`, `sprint_id`
  (`tasks/page.tsx` create modal). Assignees are added **after** creation in `TaskDetailModal`.
- Backend `create_task` **already accepts `assignee_ids`** (`app/service/task.py:96`) — so this is
  mostly a frontend gap.

**Proposed**
1. In the create modal, add a **Team** selector (dropdown of teams), then load that team's members
   and show a **multi-select** so only chosen members are assigned.
2. Send `assignee_ids` in the create payload (already supported).

**Backend**
- Add `GET /users/?team_id=` filter (or `GET /teams/{id}/members`) so the modal can fetch members
  for the chosen team. `UserService.get_all_users` exists (`app/service/user.py:38`) — add a filter.

**Frontend**
- Create-task modal: Team `<select>` → fetch members → checkbox/avatar multi-select → `assignee_ids`.

| Pros | Cons |
|------|------|
| Backend already supports assignees on create — low risk | Need a clean team→members fetch to avoid loading all users |
| Matches real workflow (assign a subset of a team) | Slightly busier create modal |

---

## 5. Project member allocation + multi-team + assign a member to many projects/tasks

**Current state**
- Create-project form uses a **raw `team_id` number input** and hardcodes `owner_id`
  (`projects/page.tsx:166-204`). No member assignment, single team only.

**Proposed** (depends on **F0.1**)
1. Replace the number input with a **teams dropdown** (multi-select → `project_teams`).
2. Add a **members multi-select** on project create/edit → `project_members`.
3. "Assign a member to multiple projects/tasks": a member-centric assignment UI — pick a user, then
   check the projects/tasks to add them to (bulk endpoint).

**Backend**
- `ProjectCreate/Update` schemas accept `team_ids: list[int]`, `member_ids: list[int]`.
- `ProjectService.create_project` (already does manual commit + re-fetch to dodge `MissingGreenlet`,
  `app/service/project.py`) extended to set teams/members with eager loading.
- New bulk endpoint `POST /users/{id}/assignments` `{ project_ids, task_ids }`.

**Frontend**
- `projects/page.tsx` create form: teams dropdown + members multi-select.
- A "Manage assignments" panel (could live in Teams → member row).

| Pros | Cons |
|------|------|
| Fixes the most obviously rough form (number input) | Largest data-model change; migration + backfill of existing single-team projects |
| Enables proper capacity/notification features downstream | Eager-loading projects with members+teams must be tuned to avoid N+1 / async lazy-load 500s |

---

## 6. Project-scoped Goals & Wikis + goal members

**Current state**
- `Goal` already has `project_id` (nullable) and `owner_id` (`app/models/goal.py`), but the Goals
  page is presented **globally** (`goals/page.tsx`).
- `WikiPage` is **already project-scoped** (`project_id` NOT NULL) and the page has a project
  dropdown (`wiki/page.tsx:23-27`) — but it is not surfaced inside the project detail page.

**Proposed**
1. Surface Goals and Wiki **inside the project detail page** (`projects/[id]/page.tsx`) as tabs/cards,
   pre-filtered to that project. Keep the global Goals view for org-wide goals (`project_id` null).
2. Add **goal members**: new `goal_members` association table + multi-select to assign owners/
   contributors; notify them on goal progress changes.

**Backend**
- Migration: `goal_members` table.
- `Goal` relationship `members: list[User]`; `GoalCreate/Update` accept `member_ids`.
- `GoalService.create/update` set members (eager-load).

**Frontend**
- Project detail: "Goals" and "Wiki" sections scoped to the current project.
- Goals create form: members multi-select.

| Pros | Cons |
|------|------|
| Data model is already 80% there (project_id exists) | Mostly surfacing/scoping work + one new table |
| Project-context view is what users expect | Two places now show goals (global vs project) — must keep filters consistent |

---

## 7. Project documents (client deliverables) — upload/download any file type

**Current state**
- Only task `Attachment` exists and it stores a **URL string**, not the file
  (`app/models/task.py:90-98`). No project-level document store, no binary storage.

**Proposed**
New `ProjectDocument` model + upload/download endpoints supporting pdf/word/excel/audio/video/image.

**Two storage options (decide with TL):**
- **A) DB blob (`LargeBinary`/BYTEA):** simplest, single source of truth, transactional.
  Risk: large media bloats the DB, slows backups, Postgres row/IO limits.
- **B) Object storage (S3/MinIO) + metadata row:** scalable, CDN-able, keeps DB lean.
  Risk: extra infra + signed-URL handling.

Given "audio/video" is in scope, **Option B is recommended**; Option A is acceptable for an MVP
capped at small files.

**Backend**
- Model `ProjectDocument(id, project_id, file_name, content_type, size, storage_key|data,
  uploaded_by, uploaded_at, visibility ['internal'|'client'])`.
- Endpoints: `POST /projects/{id}/documents` (multipart upload), `GET .../documents` (list),
  `GET .../documents/{doc_id}/download` (streamed response), `DELETE`.
- Enforce size/type limits; RBAC: members upload, clients (Feature-related) get read of `client`-
  visibility docs only.

**Frontend**
- Project detail: "Documents" card with drag-drop upload, type icons, download, visibility toggle.

| Pros | Cons |
|------|------|
| Centralizes deliverables; supports client proof-of-work | New infra (object storage) or DB-bloat tradeoff |
| Reuses streamed download pattern | Upload security: virus/type/size validation is mandatory |

---

## 8. Multi-project TLs + team-split notifications + filterable notifications

**Current state**
- A TL is tied to a **single** team (`User.team_id`) and a project to a **single** team. No way for
  a lead to span 2 projects / 3 sub-teams and receive scoped updates.
- `Notification` has no team/project/category metadata (`app/models/notification.py`), so it can't be
  filtered.

**Proposed** (depends on **F0.1**)
1. Membership (F0.1) lets a TL be a member of multiple projects/teams.
2. Add targeting metadata to `Notification`: `project_id`, `team_id`, `category`
   (e.g. `TASK`, `PROJECT`, `GOAL`, `MENTION`). Populate when created.
3. On project/task updates, notify the relevant team's members (not everyone).
4. Notification center gains **filters**: by project, by team, by category, read/unread.

**Backend**
- Migration: add `project_id`, `team_id`, `category` to `notifications`.
- Extend `NotificationService.create/create_many` to accept this metadata; update callers in
  `TaskService.update_task` and `AutomationService.evaluate`.
- `GET /notifications?project_id=&team_id=&category=` filter params.

**Frontend**
- `NotificationBell.tsx` + a full Notifications page: filter chips (project/team/category), polling
  already exists (15s).

| Pros | Cons |
|------|------|
| Makes notifications usable at TL scale instead of noise | Depends on F0.1; touches every notification producer |
| Filtering is a clear UX win | More columns on a high-volume table — index `user_id, is_read, created_at` |

---

## 9. Teams section: filter members by All / Team / Project

**Current state**
- Teams page shows teams + a flat company member directory (`teams/page.tsx:169-232`). No filtering
  by team or project.

**Proposed**
1. Filter tabs: **All members**, **By team**, **By project**.
2. Backend filters: `GET /users?team_id=` (single FK, easy) and `GET /users?project_id=` (needs
   `project_members` from F0.1).

**Backend**
- `UserService.get_all_users(team_id?, project_id?)` with optional joins.
- `GET /users` query params.

**Frontend**
- Teams page: a filter bar (segmented control) + dropdown for the chosen team/project; reuse the
  existing member table.

| Pros | Cons |
|------|------|
| Pure additive UI + query params | "By project" depends on F0.1 membership existing |
| Reuses the existing table component | — |

---

## 10. Fix the broken "+ New Team" button

**Current state**
- The "+ New Team" button is a **no-op** (dashed button, no handler) at `teams/page.tsx:139`.
- Backend is **ready**: `POST /api/teams` with `admin_required`, `TeamService.create_team` exists
  (`app/router/team.py`, `app/service/team.py:21-24`).

**Proposed**
- Wire the button to a small create-team modal (name + description) → `POST /teams` → invalidate the
  teams query + toast. Mirror the existing invite/manual-add modal pattern already on the page.

**Backend:** none (already exists).

**Frontend:** `teams/page.tsx` — add modal state, mutation with `onError` toast (the page already
imports the modal + toast patterns).

| Pros | Cons |
|------|------|
| Trivial, backend-complete — fastest win | None |

---

## 11. Duplicate-submit / idempotency on create actions

**Current state**
- Clicking **Create Task** twice before the modal closes fires `createTask.mutate(newTask)` twice
  → two rows (observed: two identical "Task Test" proposals). The button has no in-flight guard
  (`tasks/page.tsx` create modal → `createTask` mutation), and the backend `POST /tasks/` has no
  dedup — `TaskService.create_task` auto-increments `task_number` each call
  (`app/service/task.py:85-126`), so both inserts succeed.
- The same race exists on every create form: projects, sprints, goals, wiki pages, comments,
  invitations, requests — any `useMutation` whose trigger button isn't disabled while pending.

**Proposed — defense in depth (two layers)**

**Layer 1 — Frontend (fast, covers 95% of cases):**
1. Disable the submit button while the mutation is in flight: `disabled={createTask.isPending || ...}`
   and show a spinner/“Creating…” label. The pattern already exists elsewhere (e.g. calendar
   schedule button uses `scheduleMutation.isPending`) — apply it consistently to **all** create
   buttons.
2. Close the modal optimistically / clear state on first click so a second click has nothing to
   submit.

**Layer 2 — Backend idempotency key (robust, covers retries / double network sends):**
1. Frontend generates a UUID **idempotency key** per submit attempt (one key reused across retries
   of the *same* logical action) and sends it as an `Idempotency-Key` header.
2. A small `idempotency_keys` table (`key` PK, `user_id`, `endpoint`, `response_pk`, `created_at`).
   A dependency/middleware checks the key before the handler:
   - unseen → run handler, store `key → created resource id`.
   - seen → return the **already-created** resource instead of inserting again.
3. Scope keys per user + endpoint; expire rows after e.g. 24h via the existing Celery beat.

A lighter alternative to Layer 2 for tasks specifically: a short-window **uniqueness guard**
(reject an identical `title + project_id + reporter_id` created within N seconds). Cheaper, but
heuristic — the idempotency-key approach is the correct general fix.

**Backend**
- Migration: `idempotency_keys` table.
- A FastAPI dependency `idempotent(request)` applied to create routes (`POST /tasks/`, `/projects/`,
  `/sprints/`, `/goals/`, `/wiki/`, `/invitations/`, `/requests/`).
- Reuse the `@transactional` discipline so the key row and the created row commit together.

**Frontend**
- Shared `api` helper to attach an `Idempotency-Key` header on mutations (`src/lib/api.ts`).
- Disable-while-pending on every create button (audit all `useMutation` call sites).

| Pros | Cons |
|------|------|
| Layer 1 is a 5-minute fix that stops the common case immediately | Layer 2 adds a table + middleware + key lifecycle to maintain |
| Layer 2 also defends against network retries / proxy replays, not just double-clicks | Must pick consistent key scope (user+endpoint+payload) or it under/over-dedups |
| Reuses existing `isPending` + `@transactional` patterns | Slight latency: one extra keyed lookup per create request |

---

## Suggested sequencing

| Phase | Features | Rationale |
|-------|----------|-----------|
| **P1 — Quick wins** | 11-Layer1 (disable-while-pending), 10 (New Team), 3 (request category), 4 (team/members on task create) | No/minimal schema; backend mostly ready |
| **P2 — Foundation** | F0.1 (project_members + project_teams) | Unblocks 5, 8, 9 |
| **P3 — Membership features** | 5 (project allocation), 9 (Teams filters), 8 (scoped/filterable notifications) | Built on P2 |
| **P4 — Engagement** | 1 (task/project notifications), 6 (project goals/wiki + goal members) | Independent, medium effort |
| **P5 — Heavier infra** | 2 (encrypt+expire request secrets), 7 (project documents), 11-Layer2 (idempotency keys) | Security review + storage / middleware decisions needed |

## Open decisions to confirm with the TL
1. **Feature 2:** confirm **encryption + reveal-on-demand, not hashing** — the member must read the
   real key, so a hash destroys it. Also decide: time-limited (visible N days) vs one-time-reveal-
   then-scrub, and what N defaults to.
2. **Feature 3:** the fixed list of request categories.
3. **Feature 5:** keep `Project.team_id` (primary team) or fully migrate to `project_teams`.
4. **Feature 7:** DB blob vs object storage (S3/MinIO); max file size; allowed MIME types; client
   visibility rules.
5. **Feature 8:** the notification category taxonomy.

## Cross-cutting risks
- **Async lazy-load 500s (`MissingGreenlet`):** every new relationship surfaced in a response must be
  `selectinload`/`joinedload`-ed before serialization (the codebase already hit and fixed this in
  `create_project`/`create_task`). Apply the same discipline to project members/teams, goal members,
  documents.
- **Migrations on existing data:** F0.1 backfill and Feature-2 token encryption are **data
  migrations**, not just schema — test against a copy of prod data.
- **Notification volume:** Features 1 + 8 increase write volume; index the table and consider moving
  creation to Celery if it slows the update path.




