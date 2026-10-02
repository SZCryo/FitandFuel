from pydantic import BaseModel, Field

from app.models.profile import GoalMode


class MacroTargets(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class MealItem(BaseModel):
    meal_type: str
    name: str
    items: list[str] = Field(default_factory=list)
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class WorkoutDay(BaseModel):
    day_label: str
    focus: str
    exercises: list[str]


class MacroDelta(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class MealUpdateRequest(BaseModel):
    name: str | None = None
    items: list[str] | None = None
    calories: int | None = Field(default=None, ge=0)
    protein_g: int | None = Field(default=None, ge=0)
    carbs_g: int | None = Field(default=None, ge=0)
    fat_g: int | None = Field(default=None, ge=0)


class PlanResponse(BaseModel):
    user_id: str
    goal_mode: GoalMode
    targets: MacroTargets
    meals: list[MealItem]
    workout_days: list[WorkoutDay]
    actuals: MacroTargets
    variance: MacroDelta
