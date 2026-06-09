from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.note import Note
from app.schema.note import NoteCreate, NoteUpdate

class NoteService:
    async def get_user_notes(self, db: AsyncSession, user_id: int):
        query = select(Note).where(Note.user_id == user_id).order_by(Note.is_pinned.desc(), Note.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def create_note(self, db: AsyncSession, user_id: int, note_in: NoteCreate):
        note = Note(**note_in.model_dump(), user_id=user_id)
        db.add(note)
        await db.flush()
        return note

    async def update_note(self, db: AsyncSession, user_id: int, note_id: int, note_in: NoteUpdate):
        query = select(Note).where(Note.id == note_id, Note.user_id == user_id)
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        if note:
            for field, value in note_in.model_dump(exclude_unset=True).items():
                setattr(note, field, value)
            await db.flush()
        return note

    async def delete_note(self, db: AsyncSession, user_id: int, note_id: int):
        query = select(Note).where(Note.id == note_id, Note.user_id == user_id)
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        if note:
            await db.delete(note)
            return True
        return False

note_service = NoteService()
