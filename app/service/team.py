from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.team import Team
from app.models.user import User
from app.schema.team import TeamCreate, TeamUpdate
from app.core.decorators import transactional
from typing import List

class TeamService:
    @staticmethod
    async def _users_by_ids(db: AsyncSession, ids: list[int]) -> list[User]:
        if not ids:
            return []
        res = await db.execute(select(User).where(User.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def get_all_teams(db: AsyncSession) -> List[Team]:
        result = await db.execute(select(Team).options(selectinload(Team.members)))
        return result.scalars().all()

    @staticmethod
    async def get_team_by_id(db: AsyncSession, team_id: int) -> Team:
        result = await db.execute(
            select(Team).where(Team.id == team_id).options(selectinload(Team.members))
        )
        return result.scalars().first()

    @staticmethod
    async def create_team(db: AsyncSession, team_in: TeamCreate) -> Team:
        data = team_in.model_dump(exclude={"member_ids"})
        member_ids = team_in.member_ids or []
        db_team = Team(**data)
        # Many-to-many: a user can be in several teams, so we add membership
        # rows instead of overwriting the user's primary team_id.
        db_team.members = await TeamService._users_by_ids(db, member_ids)
        db.add(db_team)
        await db.commit()
        # Re-fetch with members eagerly loaded so response serialization never lazy-loads.
        return await TeamService.get_team_by_id(db, db_team.id)

    @staticmethod
    async def update_team(db: AsyncSession, db_team: Team, team_in: TeamUpdate) -> Team:
        update_data = team_in.model_dump(exclude_unset=True)
        member_ids = update_data.pop("member_ids", None)
        for field, value in update_data.items():
            setattr(db_team, field, value)
        if member_ids is not None:
            db_team.members = await TeamService._users_by_ids(db, member_ids)
        await db.commit()
        return await TeamService.get_team_by_id(db, db_team.id)

    @staticmethod
    @transactional
    async def delete_team(db: AsyncSession, db_team: Team) -> bool:
        await db.delete(db_team)
        return True
