from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.schema.automation import AutomationCreate, AutomationResponse, AutomationUpdate
from app.service.automation import automation_service

router = APIRouter(prefix="/automations", tags=["Automation"])


@router.get("/", response_model=list[AutomationResponse], dependencies=[Depends(member_required)])
async def list_rules(db: DBSessionDep, project_id: int | None = None):
    """List automation rules (optionally by project)."""
    return await automation_service.list_rules(db, project_id)


@router.post("/", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_rule(rule_in: AutomationCreate, db: DBSessionDep):
    return await automation_service.create(db, rule_in)


@router.patch("/{rule_id}", response_model=AutomationResponse, dependencies=[Depends(manager_required)])
async def update_rule(rule_id: int, rule_in: AutomationUpdate, db: DBSessionDep):
    rule = await automation_service.get_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return await automation_service.update(db, rule, rule_in)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_rule(rule_id: int, db: DBSessionDep):
    rule = await automation_service.get_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await automation_service.delete(db, rule)
    return None
