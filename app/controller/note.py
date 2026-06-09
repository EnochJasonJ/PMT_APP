from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.note import note_service
from app.schema.note import NoteCreate, NoteUpdate

class NoteController:
    @staticmethod
    async def get_user_notes(db: AsyncSession, user_id: int):
        return await note_service.get_user_notes(db, user_id)

    @staticmethod
    async def create_note(db: AsyncSession, user_id: int, note_in: NoteCreate):
        return await note_service.create_note(db, user_id, note_in)

    @staticmethod
    async def update_note(db: AsyncSession, user_id: int, note_id: int, note_in: NoteUpdate):
        note = await note_service.update_note(db, user_id, note_id, note_in)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        return note

    @staticmethod
    async def delete_note(db: AsyncSession, user_id: int, note_id: int):
        success = await note_service.delete_note(db, user_id, note_id)
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        return {"status": "success"}
