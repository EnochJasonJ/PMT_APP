from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NoteBase(BaseModel):
    title: str
    content: str
    color: str = "yellow"
    is_pinned: bool = False

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None

class Note(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
