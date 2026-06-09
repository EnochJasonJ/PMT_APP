from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Invitation(Base):
    __tablename__ = "invitations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    token: Mapped[str] = mapped_column(String(255), unique=True, default=lambda: str(uuid.uuid4()))
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    role_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    team: Mapped["Team"] = relationship()
    role: Mapped["Role"] = relationship()
