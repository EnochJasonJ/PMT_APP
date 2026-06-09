from datetime import date

from app.models.enums import ApprovalStatus, RecurrenceType, TaskPriority, TaskStatus, TaskType

from .base import BaseSchema, TimestampSchema
from .label import LabelResponse


class TaskBase(TimestampSchema):
    task_number: int
    title: str
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    type: TaskType = TaskType.TASK
    story_points: int | None = None
    due_date: date | None = None
    start_date: date | None = None
    estimate_hours: float | None = None
    logged_hours: float | None = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    requires_approval: bool = False
    approval_status: ApprovalStatus | None = None
    notify_on_update: bool = False
    project_id: int
    project_name: str | None = None
    sprint_id: int | None = None
    reporter_id: int | None = None
    parent_task_id: int | None = None


class TaskCreate(BaseSchema):
    title: str
    project_id: int
    task_number: int | None = None
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    type: TaskType = TaskType.TASK
    story_points: int | None = None
    due_date: date | None = None
    start_date: date | None = None
    estimate_hours: float | None = None
    logged_hours: float | None = None
    recurrence: RecurrenceType = RecurrenceType.NONE
    requires_approval: bool = False
    notify_on_update: bool = False
    sprint_id: int | None = None
    assignee_ids: list[int] = []
    watcher_ids: list[int] = []
    dependency_ids: list[int] = []
    label_ids: list[int] = []
    reporter_id: int | None = None
    parent_task_id: int | None = None


class TaskUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    type: TaskType | None = None
    story_points: int | None = None
    due_date: date | None = None
    start_date: date | None = None
    estimate_hours: float | None = None
    logged_hours: float | None = None
    recurrence: RecurrenceType | None = None
    requires_approval: bool | None = None
    approval_status: ApprovalStatus | None = None
    notify_on_update: bool | None = None
    sprint_id: int | None = None
    assignee_ids: list[int] | None = None
    watcher_ids: list[int] | None = None
    dependency_ids: list[int] | None = None
    label_ids: list[int] | None = None
    reporter_id: int | None = None


class TaskMini(BaseSchema):
    """Lightweight task ref for subtasks / dependencies (avoids deep nesting)."""
    id: int
    title: str
    status: TaskStatus
    task_number: int


from .user import UserResponse


class TaskResponse(TaskBase):
    id: int
    assignees: list[UserResponse] = []
    watchers: list[UserResponse] = []
    labels: list[LabelResponse] = []
    subtasks: list[TaskMini] = []
    dependencies: list[TaskMini] = []
