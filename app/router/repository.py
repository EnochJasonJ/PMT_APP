from fastapi import APIRouter, Depends, status
from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.controller.repository import RepositoryController
from app.schema.repository import RepositoryResponse, RepositoryCreate, RepositoryUpdate, BranchLookup
from typing import List

router = APIRouter(prefix="/integrations", tags=["Repository Integrations"])

@router.post("/branches", dependencies=[Depends(member_required)])
async def list_branches(payload: BranchLookup):
    """List branch names for a repository URL (used by the link/connect form)."""
    return await RepositoryController.get_branches(payload.repository_url, payload.access_token)

@router.get("/project/{project_id}", response_model=List[RepositoryResponse], dependencies=[Depends(member_required)])
async def list_project_integrations(project_id: int, db: DBSessionDep):
    """List all code repositories linked to a project"""
    return await RepositoryController.list_project_integrations(db, project_id)

@router.post("/", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_integration(integration_in: RepositoryCreate, db: DBSessionDep):
    """Link a new GitHub/GitLab/Bitbucket repository to a project"""
    return await RepositoryController.create_integration(db, integration_in)

@router.patch("/{integration_id}", response_model=RepositoryResponse, dependencies=[Depends(manager_required)])
async def update_integration(integration_id: int, integration_in: RepositoryUpdate, db: DBSessionDep):
    """Update integration settings or branch name"""
    return await RepositoryController.update_integration(db, integration_id, integration_in)

@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_integration(integration_id: int, db: DBSessionDep):
    """Remove a repository integration from a project"""
    await RepositoryController.delete_integration(db, integration_id)
    return None

@router.post("/{integration_id}/test", dependencies=[Depends(member_required)])
async def test_integration(integration_id: int, db: DBSessionDep):
    """Verify that the repository URL is reachable"""
    return await RepositoryController.test_connection(db, integration_id)

@router.get("/{integration_id}/pulls", dependencies=[Depends(member_required)])
async def get_pull_requests(integration_id: int, db: DBSessionDep):
    """Fetch all open Pull Requests from the linked repository"""
    return await RepositoryController.get_pull_requests(db, integration_id)

@router.get("/{integration_id}/commits", dependencies=[Depends(member_required)])
async def get_recent_commits(integration_id: int, db: DBSessionDep):
    """Fetch recent commits from the active branch"""
    return await RepositoryController.get_recent_commits(db, integration_id)

@router.get("/{integration_id}/issues", dependencies=[Depends(member_required)])
async def get_external_issues(integration_id: int, db: DBSessionDep):
    """Fetch open Issues from the linked repository"""
    return await RepositoryController.get_issues(db, integration_id)
