from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import inspect, Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, task_labels, task_assignees, task_watchers, task_dependencies
from .enums import ApprovalStatus, RecurrenceType, TaskPriority, TaskStatus, TaskType


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("project_id", "task_number", name="uq_project_task_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), default=TaskType.TASK, nullable=False)

    story_points: Mapped[int | None] = mapped_column(Integer)
    due_date: Mapped[date | None] = mapped_column(Date)
    start_date: Mapped[date | None] = mapped_column(Date)

    estimate_hours: Mapped[float | None] = mapped_column(Float)
    logged_hours: Mapped[float | None] = mapped_column(Float)
    recurrence: Mapped[RecurrenceType] = mapped_column(Enum(RecurrenceType), default=RecurrenceType.NONE, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_status: Mapped[ApprovalStatus | None] = mapped_column(Enum(ApprovalStatus))
    # When true, ANY change to this task notifies its assignees + watchers.
    notify_on_update: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_id: Mapped[int | None] = mapped_column(ForeignKey("sprints.id", ondelete="SET NULL"))
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    parent_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    project: Mapped["Project"] = relationship(back_populates="tasks")
    sprint: Mapped[Optional["Sprint"]] = relationship(back_populates="tasks")
    assignees: Mapped[list["User"]] = relationship(
        secondary=task_assignees,
        back_populates="assigned_tasks"
    )
    reporter: Mapped[Optional["User"]] = relationship(back_populates="reported_tasks", foreign_keys=[reporter_id])
    
    @property
    def project_name(self) -> Optional[str]:
        # Check if relationship is loaded to prevent lazy-load crash in async context
        state = inspect(self)
        if "project" in state.unloaded:
            return None
        return self.project.name if self.project else None

    parent_task: Mapped[Optional["Task"]] = relationship(remote_side=[id], back_populates="subtasks")
    subtasks: Mapped[list["Task"]] = relationship(back_populates="parent_task", cascade="all, delete-orphan")

    comments: Mapped[list["Comment"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    activities: Mapped[list["TaskActivity"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    labels: Mapped[list["Label"]] = relationship(
        secondary=task_labels,
        back_populates="tasks"
    )
    watchers: Mapped[list["User"]] = relationship(secondary=task_watchers)
    dependencies: Mapped[list["Task"]] = relationship(
        secondary=task_dependencies,
        primaryjoin="Task.id == TaskDependency.task_id",
        secondaryjoin="Task.id == TaskDependency.depends_on_id",
    )


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    task: Mapped["Task"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")


class Attachment(Base):
    __tablename__ = "attachments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    task: Mapped["Task"] = relationship(back_populates="attachments")


class TaskActivity(Base):
    __tablename__ = "task_activities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    field_name: Mapped[str | None] = mapped_column(String(100))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    task: Mapped["Task"] = relationship(back_populates="activities")
    actor: Mapped["User"] = relationship(back_populates="activities")


class Label(Base):
    __tablename__ = "labels"
    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_project_label_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="labels")
    tasks: Mapped[list["Task"]] = relationship(
        secondary=task_labels,
        back_populates="labels"
    )
