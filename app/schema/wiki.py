from datetime import datetime

from .base import BaseSchema


class WikiBase(BaseSchema):
    title: str
    content: str | None = None
    project_id: int


class WikiCreate(WikiBase):
    created_by: int | None = None


class WikiUpdate(BaseSchema):
    title: str | None = None
    content: str | None = None


class WikiResponse(WikiBase):
    id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
