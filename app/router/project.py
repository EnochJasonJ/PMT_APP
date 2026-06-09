from fastapi import APIRouter, Depends, status

from app.controller.project import ProjectController
from app.core.dependencies import DBSessionDep
from app.core.rbac import admin_required, manager_required, member_required
from app.models.user import User
from app.schema.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/", response_model=list[ProjectResponse], dependencies=[Depends(member_required)])
async def list_projects(db: DBSessionDep):
    """List all projects (Members and above)"""
    return await ProjectController.list_projects(db)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_project(project_in: ProjectCreate, db: DBSessionDep):
    """Create a new project (Managers and Admins only)"""
    return await ProjectController.create_project(db, project_in)


@router.get("/{project_id}", response_model=ProjectResponse, dependencies=[Depends(member_required)])
async def get_project(project_id: int, db: DBSessionDep):
    """Get project details by ID"""
    return await ProjectController.get_project(db, project_id)

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: DBSessionDep,
    current_user: User = Depends(manager_required),
):
    """Update project details (Managers and Admins). Notifies project team members."""
    return await ProjectController.update_project(db, project_id, project_in, actor_id=current_user.id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_required)])
async def delete_project(project_id: int, db: DBSessionDep):
    """Delete a project (Admins only)"""
    await ProjectController.delete_project(db, project_id)
    return None
