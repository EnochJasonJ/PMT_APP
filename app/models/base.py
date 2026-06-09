from sqlalchemy import ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TaskLabel(Base):
    """Association table for Tasks and Labels using modern mapped_column."""
    __tablename__ = "task_labels"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    label_id: Mapped[int] = mapped_column(ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)


class TaskAssignee(Base):
    """Association table for Tasks and Assignees (Users)."""
    __tablename__ = "task_assignees"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class TaskWatcher(Base):
    """Association table for Tasks and Watchers (Users)."""
    __tablename__ = "task_watchers"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class TaskDependency(Base):
    """Self-referential association: a task depends on another task."""
    __tablename__ = "task_dependencies"

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    depends_on_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)


class ProjectTeam(Base):
    """Association table linking a Project to many Teams (and a Team to many Projects)."""
    __tablename__ = "project_teams"

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)


class ProjectMember(Base):
    """Association table linking a Project to individually-allocated Users."""
    __tablename__ = "project_members"

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class TeamMember(Base):
    """Association table: a User can belong to many Teams (and a Team has many Users)."""
    __tablename__ = "team_members"

    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class GoalMember(Base):
    """Association table linking a Goal to its assigned Users (owners/contributors)."""
    __tablename__ = "goal_members"

    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


# Export the table objects for use in 'secondary' relationships
task_labels = TaskLabel.__table__
task_assignees = TaskAssignee.__table__
task_watchers = TaskWatcher.__table__
task_dependencies = TaskDependency.__table__
project_teams = ProjectTeam.__table__
project_members = ProjectMember.__table__
team_members = TeamMember.__table__
goal_members = GoalMember.__table__
