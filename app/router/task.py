from fastapi import APIRouter, Depends, status

from app.controller.task import TaskController
from app.core.dependencies import DBSessionDep
from app.core.rbac import member_required, manager_required
from app.schema.activity import TaskActivityResponse
from app.schema.attachment import AttachmentCreate, AttachmentResponse
from app.schema.comment import CommentCreate, CommentResponse
from app.schema.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/", response_model=list[TaskResponse], dependencies=[Depends(member_required)])
async def list_tasks(db: DBSessionDep):
    """List all tasks (Members and above)"""
    return await TaskController.list_tasks(db)


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    db: DBSessionDep,
    current_user=Depends(member_required)
):
    """Create a new task (Members create proposed tasks, Admins create todo)"""
    return await TaskController.create_task(db, task_in, current_user)


@router.get("/{task_id}", response_model=TaskResponse, dependencies=[Depends(member_required)])
async def get_task(task_id: int, db: DBSessionDep):
    """Get a specific task by ID"""
    return await TaskController.get_task(db, task_id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: DBSessionDep,
    current_user=Depends(member_required)
):
    """Update a task and log activities automatically"""
    return await TaskController.update_task(db, task_id, task_in, current_user.id)


@router.post("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(task_id: int, db: DBSessionDep, current_user=Depends(manager_required)):
    """Approve a task that requires approval (Managers and Admins)"""
    return await TaskController.set_approval(db, task_id, True, current_user.id)


@router.post("/{task_id}/reject", response_model=TaskResponse)
async def reject_task(task_id: int, db: DBSessionDep, current_user=Depends(manager_required)):
    """Reject a task that requires approval (Managers and Admins)"""
    return await TaskController.set_approval(db, task_id, False, current_user.id)


@router.get("/{task_id}/comments", response_model=list[CommentResponse], dependencies=[Depends(member_required)])
async def list_comments(task_id: int, db: DBSessionDep):
    """List all comments for a specific task"""
    return await TaskController.get_comments(db, task_id)


@router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    comment_in: CommentCreate,
    db: DBSessionDep,
    current_user=Depends(member_required)
):
    """Add a new comment to a task"""
    return await TaskController.add_comment(db, comment_in, current_user.id)


@router.get("/{task_id}/attachments", response_model=list[AttachmentResponse], dependencies=[Depends(member_required)])
async def list_attachments(task_id: int, db: DBSessionDep):
    """List all attachments for a specific task"""
    return await TaskController.get_attachments(db, task_id)


@router.post("/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(member_required)])
async def add_attachment(attachment_in: AttachmentCreate, db: DBSessionDep):
    """Add a new attachment (metadata) to a task"""
    return await TaskController.add_attachment(db, attachment_in)


@router.get("/{task_id}/activities", response_model=list[TaskActivityResponse], dependencies=[Depends(member_required)])
async def list_activities(task_id: int, db: DBSessionDep):
    """List all historical activities for a task"""
    return await TaskController.get_activities(db, task_id)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_task(task_id: int, db: DBSessionDep):
    """Delete a task (Managers and Admins)"""
    await TaskController.delete_task(db, task_id)
    return None
