from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.user import User
from app.schema.request import AdminRequest as RequestSchema, AdminRequestCreate, AdminRequestUpdate
from app.controller.request import RequestController
from app.core.decorators import transactional
from app.core.rbac import RoleChecker

# Use a more flexible role checker for the router
admin_only = RoleChecker(["admin", "Admin"])

router = APIRouter(prefix="/requests", tags=["Requests"])

@router.get("/", response_model=List[RequestSchema])
async def get_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = any(role.name.lower() == "admin" for role in current_user.roles)
    if is_admin:
        requests = await RequestController.list_all_requests(db)
        # Manually map user_name for the schema
        for r in requests:
            r.user_name = r.user.full_name if r.user else "Unknown"
        return requests
    
    return await RequestController.list_user_requests(db, current_user.id)

@router.post("/", response_model=RequestSchema)
@transactional
async def create_request(
    request_in: AdminRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await RequestController.create_request(db, current_user.id, request_in)

@router.patch("/{request_id}", response_model=RequestSchema)
@transactional
async def respond_to_request(
    request_id: int,
    request_in: AdminRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_only)
):
    return await RequestController.respond_to_request(db, request_id, request_in)
