from __future__ import annotations

from typing import List, Optional

from sqlalchemy import inspect, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, task_assignees, team_members

class UserRole(Base):
    """Association table for Many-to-Many relationship between Users and Roles."""
    __tablename__ = "user_roles"
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

# Export the table for relationship definitions
user_roles = UserRole.__table__

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String(255))

    users: Mapped[List["User"]] = relationship(
        secondary=user_roles,
        back_populates="roles"
    )

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)

    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    
    roles: Mapped[List["Role"]] = relationship(
        secondary=user_roles,
        back_populates="users"
    )
    
    team: Mapped[Optional["Team"]] = relationship(back_populates="users")

    # All teams this user belongs to (many-to-many).
    teams: Mapped[List["Team"]] = relationship(
        secondary=team_members,
        back_populates="members",
    )

    @property
    def team_name(self) -> Optional[str]:
        # Check if relationship is loaded to prevent lazy-load crash in async context
        state = inspect(self)
        if "team" in state.unloaded:
            return None
        return self.team.name if self.team else None

    created_projects: Mapped[List["Project"]] = relationship(back_populates="owner")
    assigned_tasks: Mapped[List["Task"]] = relationship(
        secondary=task_assignees,
        back_populates="assignees"
    )
    reported_tasks: Mapped[List["Task"]] = relationship(
        back_populates="reporter",
        foreign_keys="Task.reporter_id"
    )
    comments: Mapped[List["Comment"]] = relationship(back_populates="author")
    activities: Mapped[List["TaskActivity"]] = relationship(back_populates="actor")
