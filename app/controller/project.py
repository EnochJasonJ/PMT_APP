from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schema.project import ProjectCreate, ProjectUpdate
from app.service.project import ProjectService


class ProjectController:
    @staticmethod
    async def list_projects(db: AsyncSession) -> List:
        return await ProjectService.get_all_projects(db)

    @staticmethod
    async def create_project(db: AsyncSession, project_in: ProjectCreate) -> any:
        return await ProjectService.create_project(db, project_in)

    @staticmethod
    async def get_project(db: AsyncSession, project_id: int) -> any:
        project = await ProjectService.get_project_by_id(db, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project

    @staticmethod
    async def update_project(db: AsyncSession, project_id: int, project_in: ProjectUpdate, actor_id: int | None = None) -> any:
        db_project = await ProjectService.get_project_by_id(db, project_id)
        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return await ProjectService.update_project(db, db_project, project_in, actor_id=actor_id)

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: int) -> bool:
        db_project = await ProjectService.get_project_by_id(db, project_id)
        if not db_project:
            raise HTTPException(status_code=404, detail="Project not found")
        return await ProjectService.delete_project(db, db_project)
