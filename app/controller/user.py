from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User
from app.schema.user import SelfUpdate, UserCreate, UserUpdate
from app.service.user import UserService


class UserController:
    @staticmethod
    async def list_users(db: AsyncSession) -> list:
        return await UserService.get_all_users(db)

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate) -> any:
        existing_user = await UserService.get_user_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        return await UserService.create_user(db, user_in)

    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, user_in: UserUpdate) -> any:
        db_user = await UserService.get_user_by_id(db, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await UserService.update_user(db, db_user, user_in)

    @staticmethod
    async def update_self(db: AsyncSession, current_user: User, profile_in: SelfUpdate) -> any:
        update_data = profile_in.model_dump(exclude_unset=True)
        # Reject duplicate email if it's being changed
        if "email" in update_data and update_data["email"] != current_user.email:
            existing = await UserService.get_user_by_email(db, update_data["email"])
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
        db_user = await UserService.get_user_by_id(db, current_user.id)
        return await UserService.update_user(db, db_user, UserUpdate(**update_data))

    @staticmethod
    async def change_password(db: AsyncSession, current_user: User, current_password: str, new_password: str) -> dict:
        db_user = await UserService.get_user_by_id(db, current_user.id)
        if not verify_password(current_password, db_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        await UserService.change_password(db, db_user, current_password, new_password)
        return {"detail": "Password updated successfully"}

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: int) -> bool:
        db_user = await UserService.get_user_by_id(db, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await UserService.delete_user(db, db_user)
