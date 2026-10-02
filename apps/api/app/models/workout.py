from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

SessionStatus = Literal["active", "completed"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class WorkoutSessionStartRequest(BaseModel):
    user_id: str = Field(min_length=1)
    session_date: date
    focus: str = Field(min_length=1)
    exercises: list[str] = Field(min_length=1)


class WorkoutSetInput(BaseModel):
    exercise_name: str = Field(min_length=1)
    set_index: int = Field(ge=1)
    reps: int = Field(ge=1)
    weight: float = Field(ge=0)


class WorkoutCompleteRequest(BaseModel):
    duration_seconds: int = Field(ge=0)


class WorkoutSetRecord(WorkoutSetInput):
    logged_at: datetime = Field(default_factory=utc_now)


class WorkoutSessionRecord(BaseModel):
    session_id: str
    user_id: str
    session_date: date
    focus: str
    exercises: list[str]
    status: SessionStatus = "active"
    duration_seconds: int | None = None
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None
    sets: list[WorkoutSetRecord] = Field(default_factory=list)
