
from pydantic import EmailStr

from .base import BaseSchema


class RoleBase(BaseSchema):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int


class UserBase(BaseSchema):
    full_name: str
    email: EmailStr
    is_active: bool = True
    team_id: int | None = None
    team_name: str | None = None


class UserCreate(UserBase):
    password: str
    role_ids: list[int] = []  # User can be assigned multiple roles by ID


class UserUpdate(BaseSchema):
    full_name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    team_id: int | None = None
    password: str | None = None
    role_ids: list[int] | None = None


class UserResponse(UserBase):
    id: int
    roles: list[RoleResponse] = []


class SelfUpdate(BaseSchema):
    """Fields a user is allowed to change on their own profile (no role/privilege changes)."""
    full_name: str | None = None
    email: EmailStr | None = None


class PasswordChange(BaseSchema):
    current_password: str
    new_password: str
