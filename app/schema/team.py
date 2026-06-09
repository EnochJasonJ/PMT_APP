from .base import BaseSchema


class TeamBase(BaseSchema):
    name: str
    description: str | None = None
    parent_team_id: int | None = None


class TeamCreate(TeamBase):
    # Users to assign to this team on creation (sets their team_id).
    member_ids: list[int] | None = None


class TeamUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    parent_team_id: int | None = None
    member_ids: list[int] | None = None


class TeamMemberMini(BaseSchema):
    id: int
    full_name: str
    email: str


class TeamResponse(TeamBase):
    id: int
    members: list[TeamMemberMini] = []
