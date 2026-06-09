from datetime import date

from .base import BaseSchema


class SprintBase(BaseSchema):
    name: str
    goal: str | None = None
    start_date: date
    end_date: date
    project_id: int


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseSchema):
    name: str | None = None
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None  # Using str for simplicity in schema or SprintStatus


class SprintResponse(SprintBase):
    id: int
    status: str
