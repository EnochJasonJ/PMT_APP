from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.request import AdminRequest, RequestStatus
from app.schema.request import AdminRequestCreate, AdminRequestUpdate
from app.models.user import User
from app.core.crypto import encrypt_secret

class RequestService:
    async def get_all_requests(self, db: AsyncSession):
        query = select(AdminRequest).options(selectinload(AdminRequest.user)).order_by(AdminRequest.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def get_user_requests(self, db: AsyncSession, user_id: int):
        query = select(AdminRequest).where(AdminRequest.user_id == user_id).order_by(AdminRequest.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def create_request(self, db: AsyncSession, user_id: int, request_in: AdminRequestCreate):
        request = AdminRequest(**request_in.model_dump(), user_id=user_id)
        db.add(request)
        await db.flush()
        return request

    async def respond_to_request(self, db: AsyncSession, request_id: int, request_in: AdminRequestUpdate):
        query = select(AdminRequest).where(AdminRequest.id == request_id)
        result = await db.execute(query)
        request = result.scalar_one_or_none()
        if request:
            if request_in.status:
                request.status = request_in.status
            if request_in.response_content:
                # Encrypt the credential before it ever touches the DB.
                request.response_content = encrypt_secret(request_in.response_content)
            # Stamp the moment the admin answered.
            request.responded_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await db.flush()
        return request

request_service = RequestService()
