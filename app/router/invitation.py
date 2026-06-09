from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import admin_required
from app.core.security import create_access_token
from app.core.decorators import transactional
from app.schema.invitation import (
    InvitationAccept,
    InvitationCreate,
    InvitationResponse,
    InvitationSendResponse,
    InvitationVerifyResponse,
)
from app.service.invitation import invitation_service

router = APIRouter(prefix="/invitations", tags=["Invitations"])


@router.get("/", response_model=list[InvitationResponse])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    _=Depends(admin_required),
):
    """List all invitations (Admin only)."""
    return await invitation_service.get_all_invitations(db)


@router.post("/", response_model=InvitationSendResponse, status_code=status.HTTP_201_CREATED)
@transactional
async def create_invitation(
    invite_in: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(admin_required),
):
    """Create + email an invitation link (Admin only)."""
    return await invitation_service.create_invitation(db, invite_in)


@router.get("/verify/{token}", response_model=InvitationVerifyResponse)
async def verify_invitation(token: str, db: AsyncSession = Depends(get_db)):
    """Public: validate an invite token (used by the register page)."""
    return await invitation_service.verify_token(db, token)


@router.post("/accept")
@transactional
async def accept_invitation(accept_in: InvitationAccept, db: AsyncSession = Depends(get_db)):
    """Public: set a password, create the account, and auto-login."""
    user = await invitation_service.accept_invitation(db, accept_in)
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}
