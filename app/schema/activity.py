from datetime import datetime

from .base import BaseSchema


class TaskActivityResponse(BaseSchema):
    id: int
    action: str
    field_name: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    task_id: int
    actor_id: int
