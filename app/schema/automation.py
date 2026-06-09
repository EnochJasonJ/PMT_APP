from .base import BaseSchema


class AutomationBase(BaseSchema):
    name: str
    trigger_field: str  # 'status' | 'priority'
    trigger_value: str
    action_type: str    # 'notify' | 'set_status' | 'set_priority'
    action_value: str | None = None
    is_active: bool = True
    project_id: int | None = None


class AutomationCreate(AutomationBase):
    pass


class AutomationUpdate(BaseSchema):
    name: str | None = None
    trigger_field: str | None = None
    trigger_value: str | None = None
    action_type: str | None = None
    action_value: str | None = None
    is_active: bool | None = None
    project_id: int | None = None


class AutomationResponse(AutomationBase):
    id: int
