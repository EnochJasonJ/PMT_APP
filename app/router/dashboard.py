from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.dependencies import DBSessionDep
from app.models.project import Project
from app.models.task import Task, TaskActivity
from app.models.enums import TaskStatus
from app.core.rbac import member_required
from typing import Dict, Any, List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", dependencies=[Depends(member_required)])
async def get_dashboard_stats(db: DBSessionDep) -> Dict[str, Any]:
    """Get aggregate statistics for the dashboard"""
    
    # 1. Project Count
    project_count_stmt = select(func.count(Project.id))
    project_count = (await db.execute(project_count_stmt)).scalar() or 0
    
    # 2. Task Stats
    task_stats_stmt = select(Task.status, func.count(Task.id)).group_by(Task.status)
    task_stats_raw = (await db.execute(task_stats_stmt)).all()
    
    task_counts = {status.value.lower(): count for status, count in task_stats_raw}
    total_tasks = sum(task_counts.values())

    # 3. Overdue Tasks
    overdue_stmt = select(func.count(Task.id)).where(
        Task.due_date < date.today(),
        Task.status != TaskStatus.DONE
    )
    overdue_count = (await db.execute(overdue_stmt)).scalar() or 0

    # 4. Per-User Stats (Handles many-to-many assignees)
    from app.models.base import task_assignees
    user_stats_stmt = select(
        task_assignees.c.user_id, 
        Task.status, 
        func.count(Task.id)
    ).join(Task, task_assignees.c.task_id == Task.id).group_by(task_assignees.c.user_id, Task.status)
    
    user_stats_raw = (await db.execute(user_stats_stmt)).all()
    user_stats = {}
    for user_id, status, count in user_stats_raw:
        uid = str(user_id)
        if uid not in user_stats:
            user_stats[uid] = {"todo": 0, "in_progress": 0, "in_review": 0, "done": 0, "total": 0}
        user_stats[uid][status.value.lower()] = count
        user_stats[uid]["total"] += count
    
    # 4. Recent Activity (Global)
    activity_stmt = (
        select(TaskActivity)
        .order_by(TaskActivity.created_at.desc())
        .limit(5)
    )
    activities = (await db.execute(activity_stmt)).scalars().all()
    
    return {
        "projects_total": project_count,
        "tasks_total": total_tasks,
        "tasks_by_status": task_counts,
        "user_stats": user_stats,
        "overdue_total": overdue_count,
        "recent_activities": [
            {
                "id": a.id,
                "action": a.action,
                "field": a.field_name,
                "old": a.old_value,
                "new": a.new_value,
                "created_at": a.created_at,
                "task_id": a.task_id
            } for a in activities
        ]
    }
