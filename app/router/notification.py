from fastapi import APIRouter, Depends

from app.core.dependencies import DBSessionDep
from app.core.rbac import get_current_user
from app.schema.notification import NotificationResponse
from app.service.notification import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(db: DBSessionDep, current_user=Depends(get_current_user)):
    """List the current user's notifications (newest first)."""
    return await notification_service.get_for_user(db, current_user.id)


@router.post("/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: DBSessionDep, current_user=Depends(get_current_user)):
    await notification_service.mark_read(db, notif_id, current_user.id)
    return {"detail": "ok"}


@router.post("/read-all")
async def mark_all_read(db: DBSessionDep, current_user=Depends(get_current_user)):
    await notification_service.mark_all_read(db, current_user.id)
    return {"detail": "ok"}
