from fastapi import APIRouter, Depends, status
from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.controller.label import LabelController
from app.schema.label import LabelResponse, LabelCreate
from typing import List

router = APIRouter(prefix="/labels", tags=["Labels"])

@router.get("/project/{project_id}", response_model=List[LabelResponse], dependencies=[Depends(member_required)])
async def list_project_labels(project_id: int, db: DBSessionDep):
    """List all labels for a specific project"""
    return await LabelController.list_project_labels(db, project_id)

@router.post("/", response_model=LabelResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_label(label_in: LabelCreate, db: DBSessionDep):
    """Create a new project label (Managers and Admins)"""
    return await LabelController.create_label(db, label_in)

@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_label(label_id: int, db: DBSessionDep):
    """Delete a label (Managers and Admins)"""
    await LabelController.delete_label(db, label_id)
    return None
