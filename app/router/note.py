from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.user import User
from app.schema.note import Note as NoteSchema, NoteCreate, NoteUpdate
from app.controller.note import NoteController
from app.core.decorators import transactional

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.get("/", response_model=List[NoteSchema])
async def get_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await NoteController.get_user_notes(db, current_user.id)

@router.post("/", response_model=NoteSchema)
@transactional
async def create_note(
    note_in: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await NoteController.create_note(db, current_user.id, note_in)

@router.patch("/{note_id}", response_model=NoteSchema)
@transactional
async def update_note(
    note_id: int,
    note_in: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await NoteController.update_note(db, current_user.id, note_id, note_in)

@router.delete("/{note_id}")
@transactional
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await NoteController.delete_note(db, current_user.id, note_id)
