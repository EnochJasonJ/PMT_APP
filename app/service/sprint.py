
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.decorators import transactional
from app.models.sprint import Sprint
from app.schema.sprint import SprintCreate, SprintUpdate


class SprintService:
    @staticmethod
    async def get_all_sprints(db: AsyncSession, project_id: int) -> list[Sprint]:
        result = await db.execute(select(Sprint).where(Sprint.project_id == project_id))
        return result.scalars().all()

    @staticmethod
    async def get_sprint_by_id(db: AsyncSession, sprint_id: int) -> Sprint:
        result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
        return result.scalars().first()

    @staticmethod
    @transactional
    async def create_sprint(db: AsyncSession, sprint_in: SprintCreate) -> Sprint:
        db_sprint = Sprint(**sprint_in.model_dump())
        db.add(db_sprint)
        return db_sprint

    @staticmethod
    @transactional
    async def update_sprint(db: AsyncSession, db_sprint: Sprint, sprint_in: SprintUpdate) -> Sprint:
        update_data = sprint_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_sprint, field, value)
        return db_sprint

    @staticmethod
    @transactional
    async def delete_sprint(db: AsyncSession, db_sprint: Sprint) -> bool:
        await db.delete(db_sprint)
        return True
