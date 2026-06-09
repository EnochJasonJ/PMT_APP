from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app import logger
from app.core.config import setup_logger
from app.core.manager import lifespan
from app.core.redis import RedisHelper
from app.core.settings import Settings
from app.router.auth import router as auth_router
from app.router.base import router as base_router
from app.router.dashboard import router as dashboard_router
from app.router.jobs import router as jobs_router
from app.router.label import router as label_router
from app.router.project import router as project_router
from app.router.repository import router as repository_router
from app.router.role import router as role_router
from app.router.sprint import router as sprint_router
from app.router.task import router as task_router
from app.router.team import router as team_router
from app.router.user import router as user_router
from app.router.note import router as note_router
from app.router.request import router as request_router
from app.router.invitation import router as invitation_router
from app.router.goal import router as goal_router
from app.router.wiki import router as wiki_router
from app.router.automation import router as automation_router
from app.router.notification import router as notification_router

_settings = Settings()

app = FastAPI(lifespan=lifespan, debug=_settings.debug, docs_url="/api/docs", redoc_url="/redoc")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_logger(_settings.debug)

# Include routers
app.include_router(base_router)
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(team_router, prefix="/api")
app.include_router(label_router, prefix="/api")
app.include_router(project_router, prefix="/api")
app.include_router(repository_router, prefix="/api")
app.include_router(role_router, prefix="/api")
app.include_router(sprint_router, prefix="/api")
app.include_router(task_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(note_router, prefix="/api")
app.include_router(request_router, prefix="/api")
app.include_router(invitation_router, prefix="/api")
app.include_router(goal_router, prefix="/api")
app.include_router(wiki_router, prefix="/api")
app.include_router(automation_router, prefix="/api")
app.include_router(notification_router, prefix="/api")


client = TestClient(app)


def add_cache_layer(app: FastAPI) -> None:
    try:
        app.state.cache = RedisHelper()
    except Exception as e:
        logger.error(e)
