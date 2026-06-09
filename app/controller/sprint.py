from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schema.sprint import SprintCreate, SprintUpdate
from app.service.sprint import SprintService


class SprintController:
    @staticmethod
    async def list_sprints(db: AsyncSession, project_id: int) -> List:
        return await SprintService.get_all_sprints(db, project_id)

    @staticmethod
    async def create_sprint(db: AsyncSession, sprint_in: SprintCreate) -> any:
        return await SprintService.create_sprint(db, sprint_in)

    @staticmethod
    async def update_sprint(db: AsyncSession, sprint_id: int, sprint_in: SprintUpdate) -> any:
        db_sprint = await SprintService.get_sprint_by_id(db, sprint_id)
        if not db_sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        return await SprintService.update_sprint(db, db_sprint, sprint_in)

    @staticmethod
    async def delete_sprint(db: AsyncSession, sprint_id: int) -> bool:
        db_sprint = await SprintService.get_sprint_by_id(db, sprint_id)
        if not db_sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        return await SprintService.delete_sprint(db, db_sprint)
