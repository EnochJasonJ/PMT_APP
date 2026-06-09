from fastapi import APIRouter, Depends, status

from app.controller.sprint import SprintController
from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.schema.sprint import SprintCreate, SprintResponse, SprintUpdate

router = APIRouter(prefix="/sprints", tags=["Sprints"])


@router.get("/project/{project_id}", response_model=list[SprintResponse], dependencies=[Depends(member_required)])
async def list_sprints(project_id: int, db: DBSessionDep):
    """List all sprints for a specific project"""
    return await SprintController.list_sprints(db, project_id)


@router.post("/", response_model=SprintResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_sprint(sprint_in: SprintCreate, db: DBSessionDep):
    """Create a new sprint (Managers and Admins only)"""
    return await SprintController.create_sprint(db, sprint_in)


@router.patch("/{sprint_id}", response_model=SprintResponse, dependencies=[Depends(manager_required)])
async def update_sprint(sprint_id: int, sprint_in: SprintUpdate, db: DBSessionDep):
    """Update a sprint's details or status"""
    return await SprintController.update_sprint(db, sprint_id, sprint_in)

@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_sprint(sprint_id: int, db: DBSessionDep):
    """Delete a sprint (Managers and Admins)"""
    await SprintController.delete_sprint(db, sprint_id)
    return None
