from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, project_members, project_teams
from .enums import IntegrationProvider


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    # Legacy "primary" team (kept for backward compatibility). Allocation now also
    # supports many teams via project_teams and individual users via project_members.
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    team: Mapped["Team"] = relationship(back_populates="projects")
    owner: Mapped["User"] = relationship(back_populates="created_projects")
    sprints: Mapped[list["Sprint"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    integrations: Mapped[list["RepositoryIntegration"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan"
    )
    labels: Mapped[list["Label"]] = relationship(back_populates="project", cascade="all, delete-orphan")

    # Multi-team allocation + individually-allocated members.
    teams: Mapped[list["Team"]] = relationship(
        secondary=project_teams,
        back_populates="allocated_projects",
    )
    members: Mapped[list["User"]] = relationship(
        secondary=project_members,
    )


class RepositoryIntegration(Base):
    __tablename__ = "repository_integrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[IntegrationProvider] = mapped_column(Enum(IntegrationProvider), nullable=False)
    repository_name: Mapped[str] = mapped_column(String(150), nullable=False)
    repository_url: Mapped[str] = mapped_column(String(300), nullable=False)
    branch_name: Mapped[str | None] = mapped_column(String(100))
    access_token: Mapped[str | None] = mapped_column(String(255)) # For private repos
    is_active: Mapped[bool] = mapped_column(default=True)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)


    project: Mapped["Project"] = relationship(back_populates="integrations")
