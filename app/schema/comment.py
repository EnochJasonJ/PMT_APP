from datetime import datetime

from .base import BaseSchema


class CommentCreate(BaseSchema):
    content: str
    task_id: int
    # User IDs @mentioned in the comment — they get notified.
    mentioned_ids: list[int] = []


class CommentResponse(BaseSchema):
    id: int
    content: str
    task_id: int
    author_id: int
    created_at: datetime
    author_name: str | None = None
