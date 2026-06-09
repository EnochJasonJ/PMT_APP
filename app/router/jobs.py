from fastapi import APIRouter, Depends

from app.core.rbac import admin_required
from app.job.tasks.project_tasks import check_overdue_tasks, generate_project_stats, sync_repository_updates

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])


@router.post("/trigger/overdue-check", dependencies=[Depends(admin_required)])
async def trigger_overdue_check():
    """Manually trigger the overdue task check job"""
    # .delay() sends the task to Celery
    task = check_overdue_tasks.delay()
    return {"message": "Overdue check task triggered", "task_id": task.id}


@router.post("/trigger/project-stats", dependencies=[Depends(admin_required)])
async def trigger_project_stats():
    """Manually trigger the project stats generation job"""
    task = generate_project_stats.delay()
    return {"message": "Project stats task triggered", "task_id": task.id}

@router.post("/trigger/repo-sync", dependencies=[Depends(admin_required)])
async def trigger_repo_sync():
    """Manually trigger the repository sync job"""
    task = sync_repository_updates.delay()
    return {"message": "Repository sync task triggered", "task_id": task.id}
