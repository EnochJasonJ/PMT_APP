from celery import Celery
from celery.schedules import schedule


def register_celery_schedules(celery_app: Celery) -> None:
    celery_app.conf.beat_schedule = {
        "check_overdue_tasks_every_minute": {
            "task": "check_overdue_tasks",
            "schedule": schedule(60),  # Run every minute for testing
        },
        "generate_project_stats_every_2_minutes": {
            "task": "generate_project_stats",
            "schedule": schedule(120),  # Run every 2 minutes
        },
        "ping_every_10_seconds": {
            "task": "ping",
            "schedule": schedule(10),
        }
    }
