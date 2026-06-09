from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Note(Base):
    __tablename__ = "notes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(20), default="yellow")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    user: Mapped["User"] = relationship()
