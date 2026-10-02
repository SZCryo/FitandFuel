from fastapi import HTTPException

from app.models.plan import MealItem, MealUpdateRequest, PlanResponse
from app.models.profile import ProfileRecord
from app.services.planner import assemble_plan, build_swapped_meal

# Same deal as profile_store: this is intentionally simple demo storage, not a
# durable persistence layer.
_plans: dict[str, PlanResponse] = {}


def save_plan(plan: PlanResponse) -> PlanResponse:
    _plans[plan.user_id] = plan
    return plan


def get_plan(user_id: str) -> PlanResponse | None:
    return _plans.get(user_id)


def get_plan_or_404(user_id: str) -> PlanResponse:
    plan = get_plan(user_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


def update_meal(user_id: str, meal_type: str, payload: MealUpdateRequest) -> PlanResponse:
    plan = get_plan_or_404(user_id)
    meal = get_meal_or_404(plan, meal_type)
    updated_meal = meal.model_copy(update=payload.model_dump(exclude_none=True))
    return replace_meal(plan, updated_meal)


def swap_meal(user_id: str, meal_type: str, profile: ProfileRecord) -> PlanResponse:
    plan = get_plan_or_404(user_id)
    meal = get_meal_or_404(plan, meal_type)
    swapped_meal = build_swapped_meal(profile, meal)
    return replace_meal(plan, swapped_meal)


def get_meal_or_404(plan: PlanResponse, meal_type: str) -> MealItem:
    meal = next((item for item in plan.meals if item.meal_type == meal_type), None)
    if meal is None:
        raise HTTPException(status_code=404, detail="Meal type not found")
    return meal


def replace_meal(plan: PlanResponse, meal: MealItem) -> PlanResponse:
    meals = [meal if item.meal_type == meal.meal_type else item for item in plan.meals]
    # Rebuild the whole response after a meal edit/swap so actuals and variance
    # cannot drift away from the meal list.
    refreshed = assemble_plan(
        user_id=plan.user_id,
        goal_mode=plan.goal_mode,
        targets=plan.targets,
        meals=meals,
        workout_days=plan.workout_days,
    )
    _plans[plan.user_id] = refreshed
    return refreshed


def reset_plans() -> None:
    _plans.clear()
