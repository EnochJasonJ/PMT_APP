
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.decorators import transactional
from app.core.security import get_password_hash
from app.models.user import Role, User
from app.schema.user import RoleCreate, UserCreate, UserUpdate


class RoleService:
    @staticmethod
    async def get_all_roles(db: AsyncSession) -> list[Role]:
        result = await db.execute(select(Role))
        return result.scalars().all()

    @staticmethod
    async def get_role_by_id(db: AsyncSession, role_id: int) -> Role:
        result = await db.execute(select(Role).where(Role.id == role_id))
        return result.scalars().first()

    @staticmethod
    async def get_roles_by_ids(db: AsyncSession, role_ids: list[int]) -> list[Role]:
        result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
        return result.scalars().all()

    @staticmethod
    @transactional
    async def create_role(db: AsyncSession, role_in: RoleCreate) -> Role:
        db_role = Role(**role_in.model_dump())
        db.add(db_role)
        return db_role


class UserService:
    @staticmethod
    async def get_all_users(db: AsyncSession) -> list[User]:
        result = await db.execute(
            select(User).options(
                selectinload(User.roles),
                joinedload(User.team)
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.roles),
                joinedload(User.team)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User:
        result = await db.execute(
            select(User)
            .where(User.email == email)
            .options(
                selectinload(User.roles),
                joinedload(User.team)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
        # 1. Map basic fields
        db_user = User(
            full_name=user_in.full_name,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            team_id=user_in.team_id
        )

        # 2. Map Roles if provided
        if user_in.role_ids:
            roles = await RoleService.get_roles_by_ids(db, user_in.role_ids)
            db_user.roles = roles

        # 3. Mirror the primary team into the many-to-many membership table so the
        # user shows up consistently in team-based queries (notifications, filters).
        if user_in.team_id:
            from app.models.team import Team
            team = (await db.execute(select(Team).where(Team.id == user_in.team_id))).scalars().first()
            if team:
                db_user.teams = [team]

        db.add(db_user)
        await db.commit()
        # Re-fetch with roles/team eager-loaded so response serialization never lazy-loads (avoids MissingGreenlet 500).
        return await UserService.get_user_by_id(db, db_user.id)

    @staticmethod
    @transactional
    async def update_user(db: AsyncSession, db_user: User, user_in: UserUpdate) -> User:
        update_data = user_in.model_dump(exclude_unset=True)

        # Handle password hashing
        if "password" in update_data:
            db_user.password_hash = get_password_hash(update_data.pop("password"))

        # Handle Many-to-Many roles
        if "role_ids" in update_data:
            role_ids = update_data.pop("role_ids")
            roles = await RoleService.get_roles_by_ids(db, role_ids)
            db_user.roles = roles

        # Update remaining fields
        for field, value in update_data.items():
            setattr(db_user, field, value)

        return db_user

    @staticmethod
    @transactional
    async def change_password(db: AsyncSession, db_user: User, current_password: str, new_password: str) -> User:
        db_user.password_hash = get_password_hash(new_password)
        return db_user

    @staticmethod
    @transactional
    async def delete_user(db: AsyncSession, db_user: User) -> bool:
        await db.delete(db_user)
        return True
