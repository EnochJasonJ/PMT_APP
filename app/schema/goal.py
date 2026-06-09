from datetime import date

from .base import BaseSchema


class GoalBase(BaseSchema):
    title: str
    description: str | None = None
    progress: int = 0
    status: str = "on_track"
    target_date: date | None = None
    project_id: int | None = None
    owner_id: int | None = None


class GoalCreate(GoalBase):
    member_ids: list[int] | None = None


class GoalUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    progress: int | None = None
    status: str | None = None
    target_date: date | None = None
    project_id: int | None = None
    owner_id: int | None = None
    member_ids: list[int] | None = None


class GoalMemberMini(BaseSchema):
    id: int
    full_name: str
    email: str


class GoalResponse(GoalBase):
    id: int
    members: list[GoalMemberMini] = []
