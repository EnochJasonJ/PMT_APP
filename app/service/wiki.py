from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wiki import WikiPage
from app.schema.wiki import WikiCreate, WikiUpdate


class WikiService:
    @staticmethod
    async def list_for_project(db: AsyncSession, project_id: int) -> list[WikiPage]:
        result = await db.execute(
            select(WikiPage).where(WikiPage.project_id == project_id).order_by(WikiPage.updated_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, page_id: int) -> WikiPage | None:
        result = await db.execute(select(WikiPage).where(WikiPage.id == page_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, page_in: WikiCreate, created_by: int | None) -> WikiPage:
        data = page_in.model_dump()
        data["created_by"] = created_by
        page = WikiPage(**data)
        db.add(page)
        await db.commit()
        await db.refresh(page)
        return page

    @staticmethod
    async def update(db: AsyncSession, page: WikiPage, page_in: WikiUpdate) -> WikiPage:
        for field, value in page_in.model_dump(exclude_unset=True).items():
            setattr(page, field, value)
        await db.commit()
        await db.refresh(page)
        return page

    @staticmethod
    async def delete(db: AsyncSession, page: WikiPage) -> None:
        await db.delete(page)
        await db.commit()


wiki_service = WikiService()
