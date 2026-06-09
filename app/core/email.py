"""Outbound email via Resend (https://resend.com).

Sending is best-effort: if RESEND_API_KEY is unset we log and return False so the
caller can fall back to sharing the invite link manually. This keeps invites
working before the domain/key are provisioned.
"""
from __future__ import annotations

import httpx
from loguru import logger

from app.core.settings import settings

_RESEND_URL = "https://api.resend.com/emails"


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send one email. Returns True if Resend accepted it."""
    if not settings.RESEND_API_KEY:
        logger.warning(f"RESEND_API_KEY unset — email to {to} not sent. Subject: {subject!r}")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _RESEND_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            )
        if resp.status_code >= 400:
            logger.error(f"Resend rejected email to {to}: {resp.status_code} {resp.text}")
            return False
        return True
    except Exception as e:  # network / timeout — never break the request flow
        logger.error(f"Email send to {to} failed: {e}")
        return False


def invite_email_html(invite_url: str, team_name: str | None) -> str:
    """HTML body for a workspace invite."""
    where = f"the <strong>{team_name}</strong> team" if team_name else "the workspace"
    return f"""
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color:#1e293b; margin:0 0 8px;">You're invited</h2>
      <p style="color:#475569; font-size:14px; line-height:1.6;">
        You've been invited to join {where} on the Project Management Tool.
        Click below to set your password and get started.
      </p>
      <a href="{invite_url}"
         style="display:inline-block; margin:20px 0; background:#459a8c; color:#fff;
                text-decoration:none; padding:12px 28px; border-radius:10px; font-weight:700; font-size:14px;">
        Accept Invitation
      </a>
      <p style="color:#94a3b8; font-size:12px; line-height:1.6;">
        Or paste this link into your browser:<br>
        <a href="{invite_url}" style="color:#459a8c;">{invite_url}</a>
      </p>
    </div>
    """
