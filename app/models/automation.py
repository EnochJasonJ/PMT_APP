from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AutomationRule(Base):
    """
    Simple rule: WHEN a task's <trigger_field> becomes <trigger_value>,
    THEN perform <action_type> with <action_value>.
    trigger_field: 'status' | 'priority'
    action_type: 'notify' | 'set_status' | 'set_priority'
    """
    __tablename__ = "automation_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    trigger_field: Mapped[str] = mapped_column(String(30), nullable=False)
    trigger_value: Mapped[str] = mapped_column(String(50), nullable=False)
    action_type: Mapped[str] = mapped_column(String(30), nullable=False)
    action_value: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
