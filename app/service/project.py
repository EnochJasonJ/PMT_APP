

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.base import team_members
from app.models.project import Project
from app.models.team import Team
from app.models.user import User
from app.schema.project import ProjectCreate, ProjectUpdate
from app.service.notification import NotificationService


class ProjectService:
    # ----- relationship loading -----
    @staticmethod
    def _load_options():
        return (
            selectinload(Project.integrations),
            selectinload(Project.teams),
            selectinload(Project.members),
        )

    @staticmethod
    async def get_all_projects(db: AsyncSession) -> list[Project]:
        result = await db.execute(
            select(Project).options(*ProjectService._load_options())
        )
        return result.scalars().all()

    @staticmethod
    async def get_project_by_id(db: AsyncSession, project_id: int) -> Project:
        result = await db.execute(
            select(Project)
            .where(Project.id == project_id)
            .options(*ProjectService._load_options())
        )
        return result.scalars().first()

    # ----- helpers -----
    @staticmethod
    async def _teams_by_ids(db: AsyncSession, ids: list[int]) -> list[Team]:
        if not ids:
            return []
        res = await db.execute(select(Team).where(Team.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def _users_by_ids(db: AsyncSession, ids: list[int]) -> list[User]:
        if not ids:
            return []
        res = await db.execute(select(User).where(User.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def _expand_team_descendants(db: AsyncSession, team_ids: set[int]) -> set[int]:
        """Walk the team hierarchy downward so a lead team also reaches its sub-teams."""
        all_ids: set[int] = set(team_ids)
        frontier = set(team_ids)
        while frontier:
            res = await db.execute(
                select(Team.id).where(Team.parent_team_id.in_(frontier))
            )
            children = set(res.scalars().all())
            new = children - all_ids
            if not new:
                break
            all_ids |= new
            frontier = new
        return all_ids

    @staticmethod
    async def project_recipient_ids(db: AsyncSession, project: Project) -> set[int]:
        """All users that should hear about a project: members of any allocated team
        (and its sub-teams), individually-allocated members, and the owner."""
        team_ids: set[int] = {t.id for t in project.teams}
        if project.team_id:
            team_ids.add(project.team_id)

        recipients: set[int] = set()
        if team_ids:
            all_team_ids = await ProjectService._expand_team_descendants(db, team_ids)
            # Many-to-many memberships (a user may be in several teams)...
            res = await db.execute(
                select(team_members.c.user_id).where(team_members.c.team_id.in_(all_team_ids))
            )
            recipients.update(res.scalars().all())
            # ...plus the legacy primary-team link, in case membership wasn't mirrored.
            res = await db.execute(select(User.id).where(User.team_id.in_(all_team_ids)))
            recipients.update(res.scalars().all())

        recipients.update(m.id for m in project.members)
        if project.owner_id:
            recipients.add(project.owner_id)
        return recipients

    # ----- writes -----
    @staticmethod
    async def create_project(db: AsyncSession, project_in: ProjectCreate) -> Project:
        data = project_in.model_dump(exclude={"team_ids", "member_ids"})
        team_ids = list(project_in.team_ids or [])
        member_ids = list(project_in.member_ids or [])

        # Derive the legacy primary team if not explicitly given.
        if not data.get("team_id") and team_ids:
            data["team_id"] = team_ids[0]

        db_project = Project(**data)
        # Keep allocated teams consistent (always include the primary team).
        if data.get("team_id"):
            team_ids = list({*team_ids, data["team_id"]})
        db_project.teams = await ProjectService._teams_by_ids(db, team_ids)
        db_project.members = await ProjectService._users_by_ids(db, member_ids)

        db.add(db_project)
        await db.commit()

        project = await ProjectService.get_project_by_id(db, db_project.id)

        # Notify everyone newly attached to the project that it was created.
        recipients = await ProjectService.project_recipient_ids(db, project)
        recipients.discard(project.owner_id)  # the creator already knows
        if recipients:
            await NotificationService.create_many(
                db, list(recipients), f"New project '{project.name}' was created", link="/app/projects"
            )
            await db.commit()
        return project

    @staticmethod
    async def update_project(
        db: AsyncSession,
        db_project: Project,
        project_in: ProjectUpdate,
        actor_id: int | None = None,
    ) -> Project:
        update_data = project_in.model_dump(exclude_unset=True)
        team_ids = update_data.pop("team_ids", None)
        member_ids = update_data.pop("member_ids", None)

        for field, value in update_data.items():
            setattr(db_project, field, value)

        if team_ids is not None:
            ids = list(team_ids)
            if db_project.team_id:
                ids = list({*ids, db_project.team_id})
            db_project.teams = await ProjectService._teams_by_ids(db, ids)
        if member_ids is not None:
            db_project.members = await ProjectService._users_by_ids(db, member_ids)

        await db.commit()

        project = await ProjectService.get_project_by_id(db, db_project.id)

        # Any project update fans a notification out to the project's team members.
        recipients = await ProjectService.project_recipient_ids(db, project)
        if actor_id:
            recipients.discard(actor_id)
        if recipients:
            await NotificationService.create_many(
                db, list(recipients), f"Project '{project.name}' was updated", link="/app/projects"
            )
            await db.commit()
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, db_project: Project) -> bool:
        await db.delete(db_project)
        await db.commit()
        return True
