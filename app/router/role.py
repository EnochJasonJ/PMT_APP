from fastapi import APIRouter, Depends, status
from app.core.dependencies import DBSessionDep
from app.core.rbac import admin_required
from app.controller.role import RoleController
from app.schema.user import RoleResponse, RoleCreate
from typing import List

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[RoleResponse], dependencies=[Depends(admin_required)])
async def list_roles(db: DBSessionDep):
    """List all available roles (Admins only)"""
    return await RoleController.list_roles(db)

@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_required)])
async def create_role(role_in: RoleCreate, db: DBSessionDep):
    """Create a new role (Admins only)"""
    return await RoleController.create_role(db, role_in)
