from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import SprintStatus


class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    goal: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[SprintStatus] = mapped_column(Enum(SprintStatus), default=SprintStatus.PLANNED, nullable=False)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="sprints")
    tasks: Mapped[list["Task"]] = relationship(back_populates="sprint")
