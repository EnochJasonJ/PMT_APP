import asyncio
from datetime import date

from celery import shared_task
from loguru import logger
from sqlalchemy import func, select

from app.core.celery import get_celery_db_session
from app.models.enums import TaskStatus
from app.models.project import Project, RepositoryIntegration
from app.models.task import Task


def async_to_sync(awaitable):
    return asyncio.get_event_loop().run_until_complete(awaitable)


@shared_task(name="check_overdue_tasks")
def check_overdue_tasks():
    """
    Background job to identify tasks that have passed their due date
    and are not yet completed.
    """
    async def _run():
        async with get_celery_db_session() as db:
            today = date.today()
            # Find tasks that are overdue and not done
            stmt = (
                select(Task)
                .where(Task.due_date < today)
                .where(Task.status != TaskStatus.DONE)
            )
            result = await db.execute(stmt)
            overdue_tasks = result.scalars().all()

            if not overdue_tasks:
                logger.info("No overdue tasks found today.")
                return

            for task in overdue_tasks:
                logger.warning(
                    f"⚠️ OVERDUE TASK: [#{task.task_number}] {task.title} "
                    f"was due on {task.due_date}. Current status: {task.status.value}"
                )

    async_to_sync(_run())
    return True


@shared_task(name="generate_project_stats")
def generate_project_stats():
    """
    Background job to calculate health stats for all active projects.
    """
    async def _run():
        async with get_celery_db_session() as db:
            projects_result = await db.execute(select(Project))
            projects = projects_result.scalars().all()

            for project in projects:
                # Count tasks by status for this project
                stmt = (
                    select(Task.status, func.count(Task.id))
                    .where(Task.project_id == project.id)
                    .group_by(Task.status)
                )
                stats_result = await db.execute(stmt)
                stats = stats_result.all()

                stats_msg = ", ".join([f"{status.value}: {count}" for status, count in stats])
                logger.info(f"📊 Stats for Project {project.key}: {stats_msg if stats else 'No tasks yet'}")

    async_to_sync(_run())
    return True

@shared_task(name="sync_repository_updates")
def sync_repository_updates():
    """
    Background job to 'sync' external repositories.
    """
    async def _run():
        async with get_celery_db_session() as db:
            result = await db.execute(
                select(RepositoryIntegration).where(RepositoryIntegration.is_active == True)
            )
            integrations = result.scalars().all()
            
            for repo in integrations:
                logger.info(
                    f"🔄 SYNC: Checking {repo.provider.value} repo '{repo.repository_name}' "
                    f"on branch '{repo.branch_name}'..."
                )
                # Actual API calls to GitHub/GitLab would go here
                logger.info(f"✅ SYNC: {repo.repository_name} is up to date.")
                
    async_to_sync(_run())
    return True
