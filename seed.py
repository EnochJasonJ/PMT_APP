import asyncio
import sys
import os
from datetime import date

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.core.database import DBSessionManager
from app.models.user import User, Role
from app.models.team import Team
from app.models.project import Project
from app.core.security import get_password_hash

async def seed_data():
    async with DBSessionManager.session() as db:
        print("🌱 Starting Enterprise RBAC database seeding...")

        # 1. Create Default Roles
        role_names = ["admin", "manager", "member", "guest"]
        created_roles = {}
        
        for name in role_names:
            result = await db.execute(select(Role).where(Role.name == name))
            role = result.scalars().first()
            if not role:
                role = Role(name=name, description=f"Default {name} role")
                db.add(role)
                print(f"✅ Created Role: {name}")
            created_roles[name] = role
        
        await db.flush()

        # 2. Create a Team
        result = await db.execute(select(Team).where(Team.name == "Engineering"))
        team = result.scalars().first()
        if not team:
            team = Team(name="Engineering", description="The core development team")
            db.add(team)
            await db.flush()
            print(f"✅ Created Team: {team.name}")

        # 3. Create an Admin User with many-to-many roles
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                full_name="System Admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                team_id=team.id,
                is_active=True
            )
            # Assign multiple roles
            admin.roles = [created_roles["admin"], created_roles["manager"]]
            db.add(admin)
            await db.flush()
            print(f"✅ Created Admin User: admin@example.com (Roles: admin, manager)")

        # 4. Create Project Team Members
        member_names = [
            "Vibin", "Naren", "Deepak", "Kavya", 
            "Kapil", "Yalini", "Durga Prasad", "Sudhakar"
        ]
        for name in member_names:
            email = f"{name.lower().replace(' ', '.')}@example.com"
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if not user:
                user = User(
                    full_name=name,
                    email=email,
                    password_hash=get_password_hash("password123"),
                    team_id=team.id,
                    is_active=True
                )
                user.roles = [created_roles["member"]]
                db.add(user)
                print(f"✅ Created Member: {name}")

        # 5. Create a Project
        result = await db.execute(select(Project).where(Project.key == "PROJ"))
        project = result.scalars().first()
        if not project:
            project = Project(
                name="Internal Tool Revamp",
                key="PROJ",
                description="Refactoring the project management tool",
                team_id=team.id,
                owner_id=admin.id,
                start_date=date.today()
            )
            db.add(project)
            await db.flush()
            print(f"✅ Created Project: {project.name}")

        await db.commit()
        print("🌳 Enterprise Seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_data())
