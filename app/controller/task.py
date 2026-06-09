from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schema.attachment import AttachmentCreate
from app.schema.comment import CommentCreate
from app.schema.task import TaskCreate, TaskUpdate
from app.service.task import TaskService
from app.service.sprint import SprintService


class TaskController:
    @staticmethod
    async def list_tasks(db: AsyncSession) -> List:
        return await TaskService.get_all_tasks(db)

    @staticmethod
    async def _validate_sprint(db: AsyncSession, sprint_id: int, project_id: int) -> None:
        """Ensure a sprint exists and belongs to the task's project (no cross-project links)."""
        sprint = await SprintService.get_sprint_by_id(db, sprint_id)
        if not sprint or sprint.project_id != project_id:
            raise HTTPException(status_code=400, detail="Sprint does not belong to the selected project")

    @staticmethod
    async def create_task(db: AsyncSession, task_in: TaskCreate, current_user: any) -> any:
        if task_in.sprint_id is not None:
            await TaskController._validate_sprint(db, task_in.sprint_id, task_in.project_id)
        return await TaskService.create_task(db, task_in, current_user)

    @staticmethod
    async def get_task(db: AsyncSession, task_id: int) -> any:
        task = await TaskService.get_task_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    @staticmethod
    async def update_task(db: AsyncSession, task_id: int, task_in: TaskUpdate, actor_id: int) -> any:
        db_task = await TaskService.get_task_by_id(db, task_id)
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task_in.sprint_id is not None:
            await TaskController._validate_sprint(db, task_in.sprint_id, db_task.project_id)
        return await TaskService.update_task(db, db_task, task_in, actor_id)

    @staticmethod
    async def set_approval(db: AsyncSession, task_id: int, approved: bool, actor_id: int) -> any:
        from app.models.enums import ApprovalStatus
        db_task = await TaskService.get_task_by_id(db, task_id)
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        return await TaskService.update_task(
            db, db_task, TaskUpdate(approval_status=status), actor_id
        )

    @staticmethod
    async def add_comment(db: AsyncSession, comment_in: CommentCreate, author_id: int) -> any:
        task = await TaskService.get_task_by_id(db, comment_in.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return await TaskService.add_comment(db, comment_in, author_id)

    @staticmethod
    async def get_comments(db: AsyncSession, task_id: int) -> List:
        return await TaskService.get_task_comments(db, task_id)

    @staticmethod
    async def add_attachment(db: AsyncSession, attachment_in: AttachmentCreate) -> any:
        task = await TaskService.get_task_by_id(db, attachment_in.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return await TaskService.add_attachment(db, attachment_in)

    @staticmethod
    async def get_attachments(db: AsyncSession, task_id: int) -> List:
        return await TaskService.get_task_attachments(db, task_id)

    @staticmethod
    async def get_activities(db: AsyncSession, task_id: int) -> List:
        return await TaskService.get_task_activities(db, task_id)

    @staticmethod
    async def delete_task(db: AsyncSession, task_id: int) -> bool:
        db_task = await TaskService.get_task_by_id(db, task_id)
        if not db_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return await TaskService.delete_task(db, db_task)
