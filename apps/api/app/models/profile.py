from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

ActivityLevel = Literal["light", "moderate", "high", "very_high"]
GoalMode = Literal["lose_fat", "maintain", "build_muscle", "stay_consistent"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    age: int = Field(ge=13, le=100)
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    activity_level: ActivityLevel
    goal_mode: GoalMode
    dietary_preferences: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    age: int | None = Field(default=None, ge=13, le=100)
    height_cm: float | None = Field(default=None, gt=0)
    weight_kg: float | None = Field(default=None, gt=0)
    activity_level: ActivityLevel | None = None
    goal_mode: GoalMode | None = None
    dietary_preferences: list[str] | None = None
    equipment: list[str] | None = None


class ProfileRecord(ProfileBase):
    user_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
