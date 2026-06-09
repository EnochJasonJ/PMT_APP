from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.goal import Goal
from app.models.user import User
from app.schema.goal import GoalCreate, GoalUpdate


class GoalService:
    @staticmethod
    async def _users_by_ids(db: AsyncSession, ids: list[int]) -> list[User]:
        if not ids:
            return []
        res = await db.execute(select(User).where(User.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def list_goals(db: AsyncSession, project_id: int | None = None) -> list[Goal]:
        query = select(Goal).options(selectinload(Goal.members)).order_by(Goal.created_at.desc())
        if project_id is not None:
            query = query.where(Goal.project_id == project_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, goal_id: int) -> Goal | None:
        result = await db.execute(
            select(Goal).where(Goal.id == goal_id).options(selectinload(Goal.members))
        )
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, goal_in: GoalCreate) -> Goal:
        data = goal_in.model_dump(exclude={"member_ids"})
        goal = Goal(**data)
        goal.members = await GoalService._users_by_ids(db, goal_in.member_ids or [])
        db.add(goal)
        await db.commit()
        return await GoalService.get_by_id(db, goal.id)

    @staticmethod
    async def update(db: AsyncSession, goal: Goal, goal_in: GoalUpdate) -> Goal:
        update_data = goal_in.model_dump(exclude_unset=True)
        member_ids = update_data.pop("member_ids", None)
        for field, value in update_data.items():
            setattr(goal, field, value)
        if member_ids is not None:
            goal.members = await GoalService._users_by_ids(db, member_ids)
        await db.commit()
        return await GoalService.get_by_id(db, goal.id)

    @staticmethod
    async def delete(db: AsyncSession, goal: Goal) -> None:
        await db.delete(goal)
        await db.commit()


goal_service = GoalService()
