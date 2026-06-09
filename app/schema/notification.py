from datetime import datetime

from .base import BaseSchema


class NotificationResponse(BaseSchema):
    id: int
    user_id: int
    message: str
    link: str | None = None
    is_read: bool
    created_at: datetime
