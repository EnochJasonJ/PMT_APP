
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.decorators import transactional
from app.models.task import Attachment, Comment, Label, Task, TaskActivity
from app.models.user import User
from app.schema.attachment import AttachmentCreate
from app.schema.comment import CommentCreate
from app.schema.task import TaskCreate, TaskUpdate

# Window for swallowing accidental duplicate submissions (double-click / retry).
_DUPLICATE_WINDOW_SECONDS = 10


class TaskService:
    @staticmethod
    async def _users_by_ids(db: AsyncSession, ids: list[int]) -> list[User]:
        if not ids:
            return []
        res = await db.execute(
            select(User)
            .where(User.id.in_(ids))
            .options(
                selectinload(User.roles),
                joinedload(User.team)
            )
        )
        return list(res.scalars().all())

    @staticmethod
    async def _labels_by_ids(db: AsyncSession, ids: list[int]) -> list[Label]:
        if not ids:
            return []
        res = await db.execute(select(Label).where(Label.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def _tasks_by_ids(db: AsyncSession, ids: list[int]) -> list[Task]:
        if not ids:
            return []
        res = await db.execute(select(Task).where(Task.id.in_(ids)))
        return list(res.scalars().all())

    @staticmethod
    async def get_all_tasks(db: AsyncSession) -> list[Task]:
        result = await db.execute(
            select(Task).options(
                selectinload(Task.labels),
                joinedload(Task.project),
                selectinload(Task.assignees).options(
                    selectinload(User.roles),
                    joinedload(User.team)
                ),
                selectinload(Task.watchers).options(
                    selectinload(User.roles),
                    joinedload(User.team)
                ),
                selectinload(Task.subtasks),
                selectinload(Task.dependencies),
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_task_by_id(db: AsyncSession, task_id: int) -> Task:
        result = await db.execute(
            select(Task)
            .where(Task.id == task_id)
            .options(
                selectinload(Task.labels),
                joinedload(Task.project),
                selectinload(Task.assignees).options(
                    selectinload(User.roles),
                    joinedload(User.team)
                ),
                selectinload(Task.watchers).options(
                    selectinload(User.roles),
                    joinedload(User.team)
                ),
                selectinload(Task.subtasks),
                selectinload(Task.dependencies),
            )
        )
        return result.scalars().first()

    @staticmethod
    async def create_task(db: AsyncSession, task_in: TaskCreate, current_user: any) -> Task:
        # Idempotency guard: if the same reporter just created a task with the same
        # title in the same project moments ago, treat this as a duplicate submission
        # (double-click / network retry) and return the existing one instead of inserting again.
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=_DUPLICATE_WINDOW_SECONDS)
        dup = await db.execute(
            select(Task.id)
            .where(
                Task.title == task_in.title,
                Task.project_id == task_in.project_id,
                Task.reporter_id == current_user.id,
                Task.created_at >= cutoff,
            )
            .order_by(Task.created_at.desc())
            .limit(1)
        )
        existing_id = dup.scalar_one_or_none()
        if existing_id is not None:
            return await TaskService.get_task_by_id(db, existing_id)

        task_number = task_in.task_number
        if task_number is None:
            # Get max task_number for this project
            query = select(Task.task_number).where(Task.project_id == task_in.project_id).order_by(Task.task_number.desc()).limit(1)
            result = await db.execute(query)
            max_num = result.scalar_one_or_none()
            task_number = (max_num or 0) + 1

        assignees = await TaskService._users_by_ids(db, task_in.assignee_ids)
        watchers = await TaskService._users_by_ids(db, task_in.watcher_ids)
        labels = await TaskService._labels_by_ids(db, task_in.label_ids)
        dependencies = await TaskService._tasks_by_ids(db, task_in.dependency_ids)

        # Proposed Status Logic
        is_admin = any(r.name.lower() == "admin" for r in current_user.roles)
        final_status = task_in.status
        if not is_admin:
            from app.models.enums import TaskStatus
            final_status = TaskStatus.PROPOSED

        db_task = Task(
            **task_in.model_dump(exclude={
                "created_at", "updated_at", "task_number", "reporter_id",
                "assignee_ids", "watcher_ids", "dependency_ids", "label_ids", "status"
            }),
            task_number=task_number,
            reporter_id=current_user.id,
            status=final_status,
            assignees=assignees,
            watchers=watchers,
            labels=labels,
            dependencies=dependencies,
        )
        db.add(db_task)
        await db.flush()
        # Notify assignees they were put on this task (skip the creator).
        if assignees:
            from app.service.notification import NotificationService
            recipient_ids = [u.id for u in assignees if u.id != current_user.id]
            if recipient_ids:
                await NotificationService.create_many(
                    db, recipient_ids, f"You were assigned to '{db_task.title}'", link="/app/tasks"
                )
        await db.commit()
        # Re-fetch with relationships eagerly loaded so response serialization never
        # lazy-loads. (Manual commit, not @transactional, because the decorator's
        # db.refresh() expires these relationships -> MissingGreenlet on serialize.)
        return await TaskService.get_task_by_id(db, db_task.id)

    @staticmethod
    async def add_comment(db: AsyncSession, comment_in: CommentCreate, author_id: int) -> Comment:
        db_comment = Comment(
            content=comment_in.content,
            task_id=comment_in.task_id,
            author_id=author_id
        )
        db.add(db_comment)
        # Notify @mentioned users (skip the author mentioning themselves).
        mentioned = [uid for uid in set(comment_in.mentioned_ids) if uid != author_id]
        if mentioned:
            from app.service.notification import NotificationService
            task = await db.get(Task, comment_in.task_id)
            title = task.title if task else "a task"
            await NotificationService.create_many(
                db, mentioned, f"You were mentioned in a comment on '{title}'", link="/app/tasks"
            )
        await db.commit()
        result = await db.execute(
            select(Comment).options(selectinload(Comment.author)).where(Comment.id == db_comment.id)
        )
        comment = result.scalars().first()
        if comment and comment.author:
            comment.author_name = comment.author.full_name
        return comment

    @staticmethod
    async def get_task_comments(db: AsyncSession, task_id: int) -> list[Comment]:
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .where(Comment.task_id == task_id)
            .order_by(Comment.created_at.asc())
        )
        comments = result.scalars().all()
        for comment in comments:
            if comment.author:
                comment.author_name = comment.author.full_name
        return comments

    @staticmethod
    @transactional
    async def add_attachment(db: AsyncSession, attachment_in: AttachmentCreate) -> Attachment:
        db_attachment = Attachment(**attachment_in.model_dump())
        db.add(db_attachment)
        return db_attachment

    @staticmethod
    async def get_task_attachments(db: AsyncSession, task_id: int) -> list[Attachment]:
        result = await db.execute(select(Attachment).where(Attachment.task_id == task_id))
        return result.scalars().all()

    @staticmethod
    async def update_task(db: AsyncSession, db_task: Task, task_in: TaskUpdate, actor_id: int) -> Task:
        update_data = task_in.model_dump(exclude_unset=True)

        if "assignee_ids" in update_data:
            ids = update_data.pop("assignee_ids")
            if ids is not None:
                existing_ids = {u.id for u in db_task.assignees}
                db_task.assignees = await TaskService._users_by_ids(db, ids)
                # Notify newly added assignees.
                from app.service.notification import NotificationService
                new_ids = [i for i in ids if i not in existing_ids]
                if new_ids:
                    await NotificationService.create_many(
                        db, new_ids, f"You were assigned to '{db_task.title}'", link="/app/tasks"
                    )
        if "watcher_ids" in update_data:
            ids = update_data.pop("watcher_ids")
            if ids is not None:
                db_task.watchers = await TaskService._users_by_ids(db, ids)
        if "label_ids" in update_data:
            ids = update_data.pop("label_ids")
            if ids is not None:
                db_task.labels = await TaskService._labels_by_ids(db, ids)
        if "dependency_ids" in update_data:
            ids = update_data.pop("dependency_ids")
            if ids is not None:
                # A task cannot depend on itself.
                db_task.dependencies = await TaskService._tasks_by_ids(db, [i for i in ids if i != db_task.id])

        changed_fields: set[str] = set()
        for field, new_value in update_data.items():
            old_value = getattr(db_task, field)

            if old_value != new_value:
                activity = TaskActivity(
                    task_id=db_task.id,
                    actor_id=actor_id,
                    action="update",
                    field_name=field,
                    old_value=str(old_value) if old_value is not None else None,
                    new_value=str(new_value) if new_value is not None else None
                )
                db.add(activity)
                setattr(db_task, field, new_value)
                changed_fields.add(field)

        # Per-task automation: if enabled, any change pings assignees + watchers.
        if db_task.notify_on_update and changed_fields:
            from app.service.notification import NotificationService
            recipients = {u.id for u in db_task.assignees} | {u.id for u in db_task.watchers}
            recipients.discard(actor_id)
            if recipients:
                fields = ", ".join(sorted(changed_fields))
                await NotificationService.create_many(
                    db, list(recipients), f"'{db_task.title}' updated ({fields})", link="/app/tasks"
                )

        # Run automation rules against the freshly-applied changes.
        from app.service.automation import AutomationService
        await AutomationService.evaluate(db, db_task, changed_fields)

        await db.commit()
        # Re-fetch eagerly so response serialization never lazy-loads (manual commit,
        # not @transactional, whose db.refresh() would expire these relationships).
        return await TaskService.get_task_by_id(db, db_task.id)

    @staticmethod
    async def get_task_activities(db: AsyncSession, task_id: int) -> list[TaskActivity]:
        result = await db.execute(
            select(TaskActivity)
            .where(TaskActivity.task_id == task_id)
            .order_by(TaskActivity.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    @transactional
    async def delete_task(db: AsyncSession, db_task: Task) -> bool:
        await db.delete(db_task)
        return True
