from fastapi import APIRouter, Depends, status
from app.core.dependencies import DBSessionDep
from app.core.rbac import admin_required, member_required
from app.controller.team import TeamController
from app.schema.team import TeamResponse, TeamCreate, TeamUpdate
from typing import List

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.get("/", response_model=List[TeamResponse], dependencies=[Depends(member_required)])
async def list_teams(db: DBSessionDep):
    """List all teams (Members and above)"""
    return await TeamController.list_teams(db)

@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_required)])
async def create_team(team_in: TeamCreate, db: DBSessionDep):
    """Create a new team (Admins only)"""
    return await TeamController.create_team(db, team_in)

@router.patch("/{team_id}", response_model=TeamResponse, dependencies=[Depends(admin_required)])
async def update_team(team_id: int, team_in: TeamUpdate, db: DBSessionDep):
    """Update team details (Admins only)"""
    return await TeamController.update_team(db, team_id, team_in)

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_required)])
async def delete_team(team_id: int, db: DBSessionDep):
    """Delete a team (Admins only)"""
    await TeamController.delete_team(db, team_id)
    return None
