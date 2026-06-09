
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, project_teams, team_members


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)

    # Self-referential hierarchy: a lead team can split into sub-teams
    # (e.g. "Squad A" -> Frontend / Backend / Testing).
    parent_team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))

    # Legacy single-team link (User.team_id) — kept as a user's "primary" team.
    users: Mapped[list["User"]] = relationship(back_populates="team")
    projects: Mapped[list["Project"]] = relationship(back_populates="team")

    # Many-to-many membership: a user can belong to several teams.
    members: Mapped[list["User"]] = relationship(
        secondary=team_members,
        back_populates="teams",
    )

    parent: Mapped[Optional["Team"]] = relationship(
        "Team", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Team"]] = relationship(
        "Team", back_populates="parent"
    )

    # Projects this team is allocated to (many-to-many, on top of the legacy primary team_id).
    allocated_projects: Mapped[list["Project"]] = relationship(
        secondary=project_teams,
        back_populates="teams",
    )
