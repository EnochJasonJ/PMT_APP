from typing import List, Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from app.core.dependencies import DBSessionDep
from app.models.user import User
from app.core.security import decode_token
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    db: DBSessionDep, 
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user information",
        )
    
    # Eager load roles and team to prevent lazy loading errors
    result = await db.execute(
        select(User)
        .where(User.id == int(user_id))
        .options(
            selectinload(User.roles),
            joinedload(User.team)
        )
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        """
        allowed_roles: List of role names (e.g. ["admin", "manager"])
        """
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        user_role_names = [role.name for role in user.roles]
        
        # Check if user has any of the allowed roles
        if not any(role in self.allowed_roles for role in user_role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {self.allowed_roles}. You have: {user_role_names}"
            )
        return user

# Convenience instances using string names from the DB
admin_required = RoleChecker(["admin"])
manager_required = RoleChecker(["admin", "manager"])
member_required = RoleChecker(["admin", "manager", "member"])
