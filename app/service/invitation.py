import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import invite_email_html, send_email
from app.core.security import get_password_hash
from app.core.settings import settings
from app.models.invitation import Invitation
from app.models.user import Role, User
from app.schema.invitation import InvitationAccept, InvitationCreate


class InvitationService:
    async def create_invitation(self, db: AsyncSession, invite_in: InvitationCreate):
        """Create an invite, email a secure registration link, return its status.

        The link lands on the frontend /register?token=... page where the invitee
        sets their own password. If RESEND_API_KEY is unset, the email is skipped
        and the admin can copy the returned invite_url to share manually.
        """
        email = invite_in.email.lower().strip()

        # Reject if this email already has an account.
        existing = (
            await db.execute(select(User).where(func.lower(User.email) == email))
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )

        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=settings.INVITE_EXPIRE_HOURS)
        invite = Invitation(
            email=email,
            team_id=invite_in.team_id,
            role_id=invite_in.role_id,
            token=token,
            is_used=False,
            expires_at=expires_at,
        )
        db.add(invite)
        await db.flush()

        team_name = None
        if invite_in.team_id:
            from app.models.team import Team
            team = (await db.execute(select(Team).where(Team.id == invite_in.team_id))).scalars().first()
            team_name = team.name if team else None

        invite_url = f"{settings.APP_BASE_URL.rstrip('/')}/register?token={token}"
        email_sent = await send_email(
            to=email,
            subject="You're invited to the workspace",
            html=invite_email_html(invite_url, team_name),
        )

        return {
            "email": email,
            "invite_url": invite_url,
            "email_sent": email_sent,
            "expires_at": expires_at,
        }

    async def verify_token(self, db: AsyncSession, token: str):
        """Public: validate an invite token, return email + team name to show."""
        invite = await self._valid_invite(db, token)
        team_name = None
        if invite.team_id:
            from app.models.team import Team
            team = (await db.execute(select(Team).where(Team.id == invite.team_id))).scalars().first()
            team_name = team.name if team else None
        return {"email": invite.email, "team_name": team_name}

    async def accept_invitation(self, db: AsyncSession, accept_in: InvitationAccept):
        """Public: consume the token, create the account with the chosen password."""
        invite = await self._valid_invite(db, accept_in.token)

        # Guard against a race where the email got an account meanwhile.
        existing = (
            await db.execute(select(User).where(func.lower(User.email) == invite.email))
        ).scalars().first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email already has an account.")

        if len(accept_in.password) < 8:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")

        local = invite.email.split("@")[0]
        derived = " ".join(
            p.capitalize() for p in local.replace(".", " ").replace("_", " ").replace("-", " ").split()
        )
        full_name = (accept_in.full_name or "").strip() or derived or invite.email

        db_user = User(
            full_name=full_name,
            email=invite.email,
            password_hash=get_password_hash(accept_in.password),
            team_id=invite.team_id,
        )

        # Role: the invite's role, else "member".
        role: Role | None = None
        if invite.role_id:
            role = (await db.execute(select(Role).where(Role.id == invite.role_id))).scalars().first()
        if role is None:
            role = (await db.execute(select(Role).where(func.lower(Role.name) == "member"))).scalars().first()
        if role:
            db_user.roles = [role]

        if invite.team_id:
            from app.models.team import Team
            team = (await db.execute(select(Team).where(Team.id == invite.team_id))).scalars().first()
            if team:
                db_user.teams = [team]

        db.add(db_user)
        invite.is_used = True
        await db.flush()
        return db_user

    async def _valid_invite(self, db: AsyncSession, token: str) -> Invitation:
        invite = (
            await db.execute(select(Invitation).where(Invitation.token == token))
        ).scalars().first()
        if not invite or invite.is_used:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation is invalid or already used.")
        if invite.expires_at and invite.expires_at < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invitation has expired.")
        return invite

    async def get_all_invitations(self, db: AsyncSession):
        query = select(Invitation).order_by(Invitation.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()


invitation_service = InvitationService()
