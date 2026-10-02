from datetime import date

from pydantic import BaseModel

from app.models.workout import WorkoutSessionRecord


class HistoryCalendarMarker(BaseModel):
    date: date
    has_workout_data: bool
    workout_count: int


class HistoryCalendarResponse(BaseModel):
    user_id: str
    month: str
    markers: list[HistoryCalendarMarker]


class NutritionSummary(BaseModel):
    calories: int = 0
    protein_g: int = 0
    carbs_g: int = 0
    fat_g: int = 0


class HistoryDayResponse(BaseModel):
    user_id: str
    date: date
    nutrition: NutritionSummary
    workouts: list[WorkoutSessionRecord]
