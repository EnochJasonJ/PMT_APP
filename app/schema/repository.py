from typing import Optional
from .base import BaseSchema
from app.models.enums import IntegrationProvider

class RepositoryBase(BaseSchema):
    provider: IntegrationProvider
    repository_name: str
    repository_url: str
    branch_name: Optional[str] = "main"
    is_active: bool = True
    project_id: int

class RepositoryCreate(RepositoryBase):
    access_token: Optional[str] = None

class RepositoryUpdate(BaseSchema):
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None
    branch_name: Optional[str] = None
    access_token: Optional[str] = None
    is_active: Optional[bool] = None

class RepositoryResponse(RepositoryBase):
    id: int

class BranchLookup(BaseSchema):
    repository_url: str
    access_token: Optional[str] = None
    provider: Optional[IntegrationProvider] = IntegrationProvider.GITHUB
