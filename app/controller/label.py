from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.label import LabelService
from app.schema.label import LabelCreate
from typing import List

class LabelController:
    @staticmethod
    async def list_project_labels(db: AsyncSession, project_id: int) -> List:
        return await LabelService.get_project_labels(db, project_id)

    @staticmethod
    async def create_label(db: AsyncSession, label_in: LabelCreate) -> List:
        return await LabelService.create_label(db, label_in)

    @staticmethod
    async def delete_label(db: AsyncSession, label_id: int) -> bool:
        db_label = await LabelService.get_label_by_id(db, label_id)
        if not db_label:
            raise HTTPException(status_code=404, detail="Label not found")
        return await LabelService.delete_label(db, db_label)
