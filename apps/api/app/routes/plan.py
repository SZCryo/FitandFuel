from fastapi import APIRouter

from pydantic import BaseModel

from app.models.plan import MealUpdateRequest, PlanResponse
from app.services.planner import build_plan
from app.services.plan_store import get_plan_or_404, save_plan, swap_meal, update_meal
from app.services.profile_store import get_profile_or_404

router = APIRouter(prefix="/api/plan", tags=["plan"])


class PlanGenerateRequest(BaseModel):
    user_id: str


@router.post("/generate", response_model=PlanResponse)
def generate_plan_route(payload: PlanGenerateRequest) -> PlanResponse:
    profile = get_profile_or_404(payload.user_id)
    return save_plan(build_plan(profile))


@router.get("/{user_id}", response_model=PlanResponse)
def get_plan_route(user_id: str) -> PlanResponse:
    return get_plan_or_404(user_id)


@router.patch("/{user_id}/meal/{meal_type}", response_model=PlanResponse)
def update_meal_route(user_id: str, meal_type: str, payload: MealUpdateRequest) -> PlanResponse:
    return update_meal(user_id, meal_type, payload)


@router.post("/{user_id}/meal/{meal_type}/swap", response_model=PlanResponse)
def swap_meal_route(user_id: str, meal_type: str) -> PlanResponse:
    profile = get_profile_or_404(user_id)
    return swap_meal(user_id, meal_type, profile)
