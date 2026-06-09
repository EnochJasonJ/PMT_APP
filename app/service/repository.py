import httpx
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import RepositoryIntegration
from app.schema.repository import RepositoryCreate, RepositoryUpdate
from app.core.decorators import transactional
from typing import List

class RepositoryService:
    @staticmethod
    async def get_project_integrations(db: AsyncSession, project_id: int) -> List[RepositoryIntegration]:
        result = await db.execute(
            select(RepositoryIntegration).where(RepositoryIntegration.project_id == project_id)
        )
        return result.scalars().all()

    @staticmethod
    async def get_integration_by_id(db: AsyncSession, integration_id: int) -> RepositoryIntegration:
        result = await db.execute(
            select(RepositoryIntegration).where(RepositoryIntegration.id == integration_id)
        )
        return result.scalars().first()

    @staticmethod
    @transactional
    async def create_integration(db: AsyncSession, integration_in: RepositoryCreate) -> RepositoryIntegration:
        db_integration = RepositoryIntegration(**integration_in.model_dump())
        db.add(db_integration)
        return db_integration

    @staticmethod
    @transactional
    async def update_integration(db: AsyncSession, db_integration: RepositoryIntegration, integration_in: RepositoryUpdate) -> RepositoryIntegration:
        update_data = integration_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_integration, field, value)
        return db_integration

    @staticmethod
    async def delete_integration(db: AsyncSession, db_integration: RepositoryIntegration) -> bool:
        await db.delete(db_integration)
        return True

    @staticmethod
    async def get_pull_requests(db: AsyncSession, integration_id: int) -> List[dict]:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            return []
        from .integration_handler import GitHubIntegrationHandler
        handler = GitHubIntegrationHandler(db_integration.repository_url, db_integration.access_token)
        return await handler.fetch_pull_requests()

    @staticmethod
    async def get_commits(db: AsyncSession, integration_id: int) -> List[dict]:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            return []
        from .integration_handler import GitHubIntegrationHandler
        handler = GitHubIntegrationHandler(db_integration.repository_url, db_integration.access_token)
        return await handler.fetch_recent_commits(branch=db_integration.branch_name or "main")

    @staticmethod
    async def get_issues(db: AsyncSession, integration_id: int) -> List[dict]:
        db_integration = await RepositoryService.get_integration_by_id(db, integration_id)
        if not db_integration:
            return []
        from .integration_handler import GitHubIntegrationHandler
        handler = GitHubIntegrationHandler(db_integration.repository_url, db_integration.access_token)
        return await handler.fetch_issues()

    @staticmethod
    async def get_branches(repository_url: str, access_token: str = None) -> List[str]:
        """List branch names for a repo from its URL (used before the integration is saved)."""
        if not repository_url:
            return []
        from .integration_handler import GitHubIntegrationHandler
        handler = GitHubIntegrationHandler(repository_url, access_token)
        data = await handler.fetch_branches()
        if data and isinstance(data, list) and isinstance(data[0], dict) and "error" not in data[0]:
            return [b["name"] for b in data if "name" in b]
        return []

    @staticmethod
    async def test_connection(repository_url: str, provider: str = None, access_token: str = None) -> dict:
        """
        Verify if the repository URL is reachable, using a token if provided.
        """
        try:
            # GitHub and GitLab require a User-Agent header
            headers = {"User-Agent": "Internal-PM-Tool-Backend"}
            target_url = repository_url
            
            # Handle GitHub specifically (API is better than Web URL for tokens)
            if provider == "github":
                # Convert "https://github.com/user/repo" to "https://api.github.com/repos/user/repo"
                if "api.github.com" not in target_url:
                    parts = target_url.strip("/").replace(".git", "").split("/")
                    if len(parts) >= 2:
                        repo_path = "/".join(parts[-2:])
                        target_url = f"https://api.github.com/repos/{repo_path}"
                
                if access_token:
                    # github_pat_ requires "Bearer", classic tokens use "token"
                    if access_token.startswith("github_pat_"):
                        headers["Authorization"] = f"Bearer {access_token}"
                    else:
                        headers["Authorization"] = f"token {access_token}"
            
            elif access_token:
                headers["Authorization"] = f"Bearer {access_token}"
                
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(target_url, headers=headers, follow_redirects=True)
                
                if response.status_code < 400:
                    return {"status": "success", "message": f"Successfully verified integration with {provider}"}
                elif response.status_code == 404:
                    return {"status": "error", "message": "Repository not found (404). Ensure the token has 'repo' scopes and the URL is correct."}
                elif response.status_code in [401, 403]:
                    return {"status": "error", "message": "Authentication failed. Your token is either invalid or does not have access to this repo."}
                else:
                    return {"status": "error", "message": f"URL returned status {response.status_code}"}
        except Exception as e:
            logger.error(f"Repository connection test failed: {e}")
            return {"status": "error", "message": f"Could not reach repository: {str(e)}"}
