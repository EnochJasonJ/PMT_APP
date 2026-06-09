from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, Integer, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from .base import Base

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class AdminRequest(Base):
    __tablename__ = "admin_requests"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), default=RequestStatus.PENDING)
    response_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    # When the admin responded (null until answered).
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    user: Mapped["User"] = relationship()
