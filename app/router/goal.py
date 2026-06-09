from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DBSessionDep
from app.core.rbac import manager_required, member_required
from app.schema.goal import GoalCreate, GoalResponse, GoalUpdate
from app.service.goal import goal_service

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("/", response_model=list[GoalResponse], dependencies=[Depends(member_required)])
async def list_goals(db: DBSessionDep, project_id: int | None = None):
    """List goals/OKRs (optionally filtered by project)."""
    return await goal_service.list_goals(db, project_id)


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_required)])
async def create_goal(goal_in: GoalCreate, db: DBSessionDep):
    return await goal_service.create(db, goal_in)


@router.patch("/{goal_id}", response_model=GoalResponse, dependencies=[Depends(member_required)])
async def update_goal(goal_id: int, goal_in: GoalUpdate, db: DBSessionDep):
    goal = await goal_service.get_by_id(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return await goal_service.update(db, goal, goal_in)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(manager_required)])
async def delete_goal(goal_id: int, db: DBSessionDep):
    goal = await goal_service.get_by_id(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await goal_service.delete(db, goal)
    return None
