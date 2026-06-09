import functools

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession


def transactional(func):
    """
    Decorator to handle DB transactions (commit/rollback) automatically.
    The decorated function must have 'db' as an AsyncSession argument.
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract 'db' from positional or keyword arguments
        db = kwargs.get('db')
        if not db:
            for arg in args:
                if isinstance(arg, AsyncSession):
                    db = arg
                    break

        if not db:
            logger.error("Transaction decorator used on a function without an AsyncSession 'db' argument.")
            return await func(*args, **kwargs)

        try:
            result = await func(*args, **kwargs)

            # Only commit if we are in a top-level transaction
            if db.in_transaction():
                await db.commit()
                # If the result is a model instance, refresh it to get DB-generated fields
                if result and hasattr(result, "__mapper__"):
                    try:
                        await db.refresh(result)
                    except Exception:
                        pass  # Ignore refresh errors for non-attached objects

            return result
        except Exception as e:
            if db.in_transaction():
                await db.rollback()
            logger.error(f"Transaction failed, rolled back: {e}")
            raise e
    return wrapper
