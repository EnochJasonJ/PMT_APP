from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    @staticmethod
    async def create(db: AsyncSession, user_id: int, message: str, link: str | None = None) -> Notification:
        """Create a notification. Caller is responsible for the surrounding transaction/commit."""
        notif = Notification(user_id=user_id, message=message, link=link)
        db.add(notif)
        return notif

    @staticmethod
    async def create_many(db: AsyncSession, user_ids: list[int], message: str, link: str | None = None) -> None:
        for uid in set(user_ids):
            db.add(Notification(user_id=uid, message=message, link=link))

    @staticmethod
    async def get_for_user(db: AsyncSession, user_id: int) -> list[Notification]:
        result = await db.execute(
            select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(100)
        )
        return list(result.scalars().all())

    @staticmethod
    async def mark_read(db: AsyncSession, notif_id: int, user_id: int) -> None:
        await db.execute(
            update(Notification).where(Notification.id == notif_id, Notification.user_id == user_id).values(is_read=True)
        )
        await db.commit()

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: int) -> None:
        await db.execute(update(Notification).where(Notification.user_id == user_id).values(is_read=True))
        await db.commit()


notification_service = NotificationService()
