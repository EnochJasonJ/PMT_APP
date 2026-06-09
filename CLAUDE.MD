# Project: Internal Project Management Tool

This is an **internal Project Management Tool** designed for company use to help teams plan work, track progress, collaborate, and monitor delivery in one place. Inspired by Jira-style workflows, scoped for internal usage with MVP modules.

## Technical Stack
- **Framework:** FastAPI
- **Database:** PostgreSQL with SQLAlchemy (Declarative ORM)
- **Migrations:** Alembic
- **Task Queue:** Celery with Redis
- **Linting/Formatting:** Ruff
- **Type Checking:** MyPy (Strict)
- **Testing:** PyTest

## Build & Run Commands
- **Install Dependencies:** `pip install -r requirements.txt`
- **Initial Setup:** `./setup.sh` (Configures Git and installs pre-commit hooks)
- **Infrastructure:** `docker compose up -d` (Postgres and Redis)
- **Database Migrations:** `alembic upgrade head`
- **Start API Server:** `./start.sh` (Gunicorn/Uvicorn)
- **Start Celery Worker:** `celery -A app worker --loglevel=info`
- **Start Celery Beat:** `celery -A app beat --loglevel=info`

## Test & Lint Commands
- **Run All Checks:** `./before-commit.sh` (Format, Lint, Type-check, and Tests)
- **Format Code:** `ruff format .`
- **Lint Code:** `ruff check . --fix`
- **Type Check:** `mypy .`
- **Run Tests:** `pytest`
- **Code Coverage:** `./coverage.sh` or `pytest --cov=app --cov-report=term-missing`

## Objective & MVP Scope
The goal is a lightweight, centralized system for:
- Managing work items (Tasks/Subtasks).
- Tracking sprints and Kanban boards.
- Monitoring team workload and activity.
- Collaborating via comments and attachments.
- Integrating with code repositories (GitHub/GitLab/Bitbucket).
- Managing documentation and internal work requests (Forms).

## Schema Entities
- `Team`, `User`, `Project`, `Sprint`, `Task`, `Comment`, `Attachment`, `TaskActivity`, `Label`, `RepositoryIntegration`.

## Coding Style & Conventions
- **Style:** Follow PEP 8 via Ruff. Use double quotes for strings.
- **Types:** Strict type hinting required. Run MyPy before committing.
- **Models:** Use SQLAlchemy Declarative ORM style.
- **API:** FastAPI best practices (dependency injection, Pydantic schemas).
- **Git:** Use `before-commit.sh` to ensure code quality before pushing.
