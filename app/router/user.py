from fastapi import APIRouter, Depends, status

from app.controller.user import UserController
from app.core.dependencies import DBSessionDep
from app.core.rbac import admin_required, get_current_user, member_required
from app.schema.user import PasswordChange, SelfUpdate, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse], dependencies=[Depends(member_required)])
async def list_users(db: DBSessionDep):
    """List all users (Managers and Admins only)"""
    return await UserController.list_users(db)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_required)])
async def create_user(user_in: UserCreate, db: DBSessionDep):
    """Create a new user (Admins only)"""
    return await UserController.create_user(db, user_in)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Get current logged in user info"""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(profile_in: SelfUpdate, db: DBSessionDep, current_user=Depends(get_current_user)):
    """Update your own profile (name/email). No role or privilege changes."""
    return await UserController.update_self(db, current_user, profile_in)


@router.post("/me/password")
async def change_my_password(payload: PasswordChange, db: DBSessionDep, current_user=Depends(get_current_user)):
    """Change your own password after verifying the current one."""
    return await UserController.change_password(db, current_user, payload.current_password, payload.new_password)


@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(admin_required)])
async def update_user(user_id: int, user_in: UserUpdate, db: DBSessionDep):
    """Update user profile or role (Admins only)"""
    return await UserController.update_user(db, user_id, user_in)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_required)])
async def delete_user(user_id: int, db: DBSessionDep):
    """Delete a user (Admins only)"""
    await UserController.delete_user(db, user_id)
    return
