from typing import List, Optional
from datetime import date
from .base import BaseSchema
from .repository import RepositoryResponse


class ProjectBase(BaseSchema):
    name: str
    key: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    owner_id: int
    # Primary team (legacy). If omitted, the first of team_ids is used.
    team_id: Optional[int] = None
    # Multi-team allocation + individually-allocated members.
    team_ids: Optional[List[int]] = None
    member_ids: Optional[List[int]] = None


class ProjectUpdate(BaseSchema):
    name: Optional[str] = None
    key: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    team_id: Optional[int] = None
    team_ids: Optional[List[int]] = None
    member_ids: Optional[List[int]] = None


class TeamMini(BaseSchema):
    id: int
    name: str


class UserMini(BaseSchema):
    id: int
    full_name: str
    email: str


class ProjectResponse(ProjectBase):
    id: int
    team_id: Optional[int] = None
    owner_id: int
    integrations: List[RepositoryResponse] = []
    teams: List[TeamMini] = []
    members: List[UserMini] = []
