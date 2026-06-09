from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.task import Label
from app.schema.label import LabelCreate
from app.core.decorators import transactional
from typing import List

class LabelService:
    @staticmethod
    async def get_project_labels(db: AsyncSession, project_id: int) -> List[Label]:
        result = await db.execute(select(Label).where(Label.project_id == project_id))
        return result.scalars().all()

    @staticmethod
    async def get_label_by_id(db: AsyncSession, label_id: int) -> Label:
        result = await db.execute(select(Label).where(Label.id == label_id))
        return result.scalars().first()

    @staticmethod
    @transactional
    async def create_label(db: AsyncSession, label_in: LabelCreate) -> Label:
        db_label = Label(**label_in.model_dump())
        db.add(db_label)
        return db_label

    @staticmethod
    @transactional
    async def delete_label(db: AsyncSession, db_label: Label) -> bool:
        await db.delete(db_label)
        return True
