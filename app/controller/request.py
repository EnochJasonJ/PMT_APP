from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.request import request_service
from app.schema.request import AdminRequestCreate, AdminRequestUpdate

class RequestController:
    @staticmethod
    async def list_all_requests(db: AsyncSession):
        return await request_service.get_all_requests(db)

    @staticmethod
    async def list_user_requests(db: AsyncSession, user_id: int):
        return await request_service.get_user_requests(db, user_id)

    @staticmethod
    async def create_request(db: AsyncSession, user_id: int, request_in: AdminRequestCreate):
        return await request_service.create_request(db, user_id, request_in)

    @staticmethod
    async def respond_to_request(db: AsyncSession, request_id: int, request_in: AdminRequestUpdate):
        request = await request_service.respond_to_request(db, request_id, request_in)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        return request
