from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.repository import RepositoryService
from app.schema.repository import RepositoryCreate, RepositoryUpdate
from typing import List

class RepositoryController:
    @staticmethod
    async def list_project_integrations(db: AsyncSession, project_id: int) -> List:
        return await RepositoryService.get_project_integrations(db, project_id)

    @staticmethod
    async def create_integration(db: AsyncSession, integration_in: RepositoryCreate) -> any:
        return await RepositoryService.create_integration(db, integration_in)

    @staticmethod
    async def update_integration(db: AsyncSession, integration_id: int, integration_in: RepositoryUpdate) -> any:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        return await RepositoryService.update_integration(db, db_integration, integration_in)

    @staticmethod
    async def delete_integration(db: AsyncSession, integration_id: int) -> bool:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        return await RepositoryService.delete_integration(db, db_integration)

    @staticmethod
    async def get_pull_requests(db: AsyncSession, integration_id: int) -> List:
        return await RepositoryService.get_pull_requests(db, integration_id)

    @staticmethod
    async def get_recent_commits(db: AsyncSession, integration_id: int) -> List:
        return await RepositoryService.get_commits(db, integration_id)

    @staticmethod
    async def get_issues(db: AsyncSession, integration_id: int) -> List:
        return await RepositoryService.get_issues(db, integration_id)

    @staticmethod
    async def get_branches(repository_url: str, access_token: str = None) -> List[str]:
        return await RepositoryService.get_branches(repository_url, access_token)

    @staticmethod
    async def test_connection(db: AsyncSession, integration_id: int) -> dict:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        return await RepositoryService.test_connection(
            db_integration.repository_url, 
            db_integration.provider.value, 
            db_integration.access_token
        )
