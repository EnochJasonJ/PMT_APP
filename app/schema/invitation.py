from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class InvitationBase(BaseModel):
    email: EmailStr
    team_id: Optional[int] = None
    role_id: Optional[int] = None

class InvitationCreate(InvitationBase):
    pass

class InvitationResponse(InvitationBase):
    id: int
    token: str
    is_used: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvitationSendResponse(BaseModel):
    """Returned after an invite is created (and emailed, if a key is configured)."""
    email: EmailStr
    invite_url: str
    email_sent: bool
    expires_at: Optional[datetime] = None


class InvitationVerifyResponse(BaseModel):
    """Public — what the register page shows before the invitee sets a password."""
    email: EmailStr
    team_name: Optional[str] = None


class InvitationAccept(BaseModel):
    token: str
    full_name: Optional[str] = None
    password: str
