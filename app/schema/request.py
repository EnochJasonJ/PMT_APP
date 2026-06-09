from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator
from app.models.request import RequestStatus
from app.core.crypto import decrypt_secret

class AdminRequestBase(BaseModel):
    title: str
    description: str

class AdminRequestCreate(AdminRequestBase):
    pass

class AdminRequestUpdate(BaseModel):
    status: Optional[RequestStatus] = None
    response_content: Optional[str] = None

class AdminRequest(AdminRequestBase):
    id: int
    status: RequestStatus
    response_content: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None

    # Nested user info for admin view
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _decrypt_response(self) -> "AdminRequest":
        # Decrypt the stored credential for the API response only.
        # Operates on the schema copy, never the ORM row, so nothing is re-persisted.
        self.response_content = decrypt_secret(self.response_content)
        return self
