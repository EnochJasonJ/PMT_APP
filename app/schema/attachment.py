from datetime import datetime

from .base import BaseSchema


class AttachmentBase(BaseSchema):
    file_name: str
    file_url: str
    task_id: int


class AttachmentCreate(AttachmentBase):
    pass


class AttachmentResponse(AttachmentBase):
    id: int
    uploaded_at: datetime
