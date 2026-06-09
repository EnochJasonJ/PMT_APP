from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.user import RoleService
from app.schema.user import RoleCreate
from typing import List

class RoleController:
    @staticmethod
    async def list_roles(db: AsyncSession) -> List:
        return await RoleService.get_all_roles(db)

    @staticmethod
    async def create_role(db: AsyncSession, role_in: RoleCreate) -> List:
        return await RoleService.create_role(db, role_in)
