from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.team import TeamService
from app.schema.team import TeamCreate, TeamUpdate
from typing import List

class TeamController:
    @staticmethod
    async def list_teams(db: AsyncSession) -> List:
        return await TeamService.get_all_teams(db)

    @staticmethod
    async def create_team(db: AsyncSession, team_in: TeamCreate) -> List:
        return await TeamService.create_team(db, team_in)

    @staticmethod
    async def update_team(db: AsyncSession, team_id: int, team_in: TeamUpdate) -> List:
        db_team = await TeamService.get_team_by_id(db, team_id)
        if not db_team:
            raise HTTPException(status_code=404, detail="Team not found")
        return await TeamService.update_team(db, db_team, team_in)

    @staticmethod
    async def delete_team(db: AsyncSession, team_id: int) -> bool:
        db_team = await TeamService.get_team_by_id(db, team_id)
        if not db_team:
            raise HTTPException(status_code=404, detail="Team not found")
        return await TeamService.delete_team(db, db_team)
