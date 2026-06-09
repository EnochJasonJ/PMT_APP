from typing import Optional
from .base import BaseSchema

class LabelBase(BaseSchema):
    name: str
    color: Optional[str] = None
    project_id: int

class LabelCreate(LabelBase):
    pass

class LabelResponse(LabelBase):
    id: int
