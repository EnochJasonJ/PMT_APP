from enum import Enum


class TaskStatus(str, Enum):
    PROPOSED = "PROPOSED"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskType(str, Enum):
    EPIC = "EPIC"
    FEATURE = "FEATURE"
    STORY = "STORY"
    TASK = "TASK"
    SUBTASK = "SUBTASK"


class IntegrationProvider(str, Enum):
    GITHUB = "GITHUB"
    GITLAB = "GITLAB"
    BITBUCKET = "BITBUCKET"


class SprintStatus(str, Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class RecurrenceType(str, Enum):
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
