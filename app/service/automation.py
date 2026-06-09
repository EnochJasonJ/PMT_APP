from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.automation import AutomationRule
from app.schema.automation import AutomationCreate, AutomationUpdate
from app.service.notification import NotificationService


class AutomationService:
    @staticmethod
    async def list_rules(db: AsyncSession, project_id: int | None = None) -> list[AutomationRule]:
        query = select(AutomationRule).order_by(AutomationRule.created_at.desc())
        if project_id is not None:
            query = query.where(AutomationRule.project_id == project_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, rule_id: int) -> AutomationRule | None:
        result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, rule_in: AutomationCreate) -> AutomationRule:
        rule = AutomationRule(**rule_in.model_dump())
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def update(db: AsyncSession, rule: AutomationRule, rule_in: AutomationUpdate) -> AutomationRule:
        for field, value in rule_in.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def delete(db: AsyncSession, rule: AutomationRule) -> None:
        await db.delete(rule)
        await db.commit()

    @staticmethod
    async def evaluate(db: AsyncSession, task, changed_fields: set[str]) -> None:
        """
        Run automation rules after a task changed. Applies matching rules' actions.
        Must be called inside the task's transaction (before commit). Does not commit.
        """
        if not changed_fields:
            return
        # Rules for this project OR global (project_id is null).
        result = await db.execute(
            select(AutomationRule).where(
                AutomationRule.is_active.is_(True),
                AutomationRule.project_id.in_([task.project_id, None]),
            )
        )
        rules = result.scalars().all()
        for rule in rules:
            if rule.trigger_field not in changed_fields:
                continue
            current = getattr(task, rule.trigger_field, None)
            current_value = current.value if hasattr(current, "value") else str(current)
            if current_value != rule.trigger_value:
                continue
            # Action
            if rule.action_type == "notify":
                msg = rule.action_value or f"Automation: task '{task.title}' {rule.trigger_field} is {rule.trigger_value}"
                recipients = [u.id for u in (task.assignees or [])] + [u.id for u in (task.watchers or [])]
                if task.reporter_id:
                    recipients.append(task.reporter_id)
                await NotificationService.create_many(db, recipients, msg, link="/app/tasks")
            elif rule.action_type == "set_status" and rule.action_value:
                setattr(task, "status", rule.action_value)
            elif rule.action_type == "set_priority" and rule.action_value:
                setattr(task, "priority", rule.action_value)


automation_service = AutomationService()
