from collections.abc import Mapping
from fastapi import HTTPException

from app.models.plan import MacroDelta, MacroTargets, MealItem, PlanResponse, WorkoutDay
from app.models.profile import GoalMode, ProfileRecord

# These constants are deliberately plain dictionaries. It made review and tests
# easier than hiding the MVP math in a black-box "planner" object.
_activity_factors = {
    "light": 28,
    "moderate": 31,
    "high": 34,
    "very_high": 37,
}

_goal_adjustments = {
    "lose_fat": -350,
    "maintain": 0,
    "build_muscle": 250,
    "stay_consistent": -100,
}

_protein_factors = {
    "lose_fat": 2.2,
    "maintain": 1.9,
    "build_muscle": 2.3,
    "stay_consistent": 1.8,
}

_fat_factors = {
    "lose_fat": 0.8,
    "maintain": 0.9,
    "build_muscle": 0.85,
    "stay_consistent": 0.8,
}

_meal_shares = {
    "breakfast": 0.28,
    "lunch": 0.34,
    "dinner": 0.38,
}

_standard_meal_templates: dict[str, list[tuple[str, list[str]]]] = {
    "breakfast": [
        ("Greek yogurt bowl", ["Greek yogurt", "Oats", "Blueberries"]),
        ("Eggs and oats", ["Whole eggs", "Oatmeal", "Banana"]),
        ("Protein smoothie", ["Whey isolate", "Oats", "Peanut butter"]),
    ],
    "lunch": [
        ("Chicken rice bowl", ["Chicken thigh", "Rice", "Mixed vegetables"]),
        ("Turkey wrap plate", ["Turkey wrap", "Roasted potatoes", "Fruit"]),
        ("Steak and rice", ["Sirloin steak", "Jasmine rice", "Green beans"]),
    ],
    "dinner": [
        ("Salmon and potatoes", ["Salmon", "Baby potatoes", "Broccoli"]),
        ("Chicken pasta", ["Chicken breast", "Pasta", "Spinach"]),
        ("Beef and sweet potato", ["Lean beef", "Sweet potato", "Asparagus"]),
    ],
}

_vegetarian_meal_templates: dict[str, list[tuple[str, list[str]]]] = {
    "breakfast": [
        ("Protein oats", ["Oats", "Protein powder", "Blueberries"]),
        ("Egg scramble plate", ["Eggs", "Sourdough toast", "Fruit"]),
        ("Yogurt parfait", ["Greek yogurt", "Granola", "Strawberries"]),
    ],
    "lunch": [
        ("Tofu rice bowl", ["Tofu", "Rice", "Snap peas"]),
        ("Lentil grain bowl", ["Lentils", "Quinoa", "Roasted vegetables"]),
        ("Paneer wrap plate", ["Paneer wrap", "Potatoes", "Cucumber salad"]),
    ],
    "dinner": [
        ("Lentil pasta", ["Lentil pasta", "Tomato sauce", "Zucchini"]),
        ("Tempeh stir fry", ["Tempeh", "Rice", "Broccoli"]),
        ("Bean chili bowl", ["Bean chili", "Rice", "Avocado"]),
    ],
}


def build_plan(profile: ProfileRecord) -> PlanResponse:
    ensure_profile_ready(profile)
    targets = build_targets(profile)
    meals = build_meals(targets, profile.dietary_preferences)

    return assemble_plan(
        user_id=profile.user_id,
        goal_mode=profile.goal_mode,
        targets=targets,
        meals=meals,
        workout_days=build_workout_days(profile.goal_mode, profile.equipment),
    )


def ensure_profile_ready(profile: ProfileRecord) -> None:
    if not profile.equipment:
        raise HTTPException(status_code=422, detail="Profile must include at least one equipment option")


def build_targets(profile: ProfileRecord) -> MacroTargets:
    maintenance = int(round(profile.weight_kg * _activity_factors[profile.activity_level]))
    calories = max(1400, maintenance + _goal_adjustments[profile.goal_mode])
    protein_g = int(round(profile.weight_kg * _protein_factors[profile.goal_mode]))
    fat_g = int(round(profile.weight_kg * _fat_factors[profile.goal_mode]))
    carbs_g = max(60, int(round((calories - ((protein_g * 4) + (fat_g * 9))) / 4)))

    return MacroTargets(
        calories=calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
    )


def assemble_plan(
    *,
    user_id: str,
    goal_mode: GoalMode,
    targets: MacroTargets,
    meals: list[MealItem],
    workout_days: list[WorkoutDay],
) -> PlanResponse:
    actuals = calculate_actuals(meals)
    variance = calculate_variance(targets, actuals)

    return PlanResponse(
        user_id=user_id,
        goal_mode=goal_mode,
        targets=targets,
        meals=meals,
        workout_days=workout_days,
        actuals=actuals,
        variance=variance,
    )


def build_meals(targets: MacroTargets, dietary_preferences: list[str]) -> list[MealItem]:
    meal_templates = get_meal_templates(dietary_preferences)
    meals: list[MealItem] = []

    for meal_type, share in _meal_shares.items():
        name, items = meal_templates[meal_type][0]
        meals.append(
            MealItem(
                meal_type=meal_type,
                name=name,
                items=items,
                calories=int(round(targets.calories * share)),
                protein_g=int(round(targets.protein_g * share)),
                carbs_g=int(round(targets.carbs_g * share)),
                fat_g=int(round(targets.fat_g * share)),
            )
        )

    return meals


def get_meal_templates(dietary_preferences: list[str]) -> Mapping[str, list[tuple[str, list[str]]]]:
    vegetarian = any(pref.lower() == "vegetarian" for pref in dietary_preferences)
    return _vegetarian_meal_templates if vegetarian else _standard_meal_templates


def build_swapped_meal(profile: ProfileRecord, meal: MealItem) -> MealItem:
    options = get_meal_templates(profile.dietary_preferences).get(meal.meal_type)
    if not options:
        raise HTTPException(status_code=404, detail="Meal type not found")

    # Swap cycles to the next template instead of randomizing. Predictable output
    # is less flashy, but it is much easier to test and demo.
    current_index = next((index for index, option in enumerate(options) if option[0] == meal.name), -1)
    next_index = (current_index + 1) % len(options)
    next_name, next_items = options[next_index]

    return meal.model_copy(update={"name": next_name, "items": next_items})


def calculate_actuals(meals: list[MealItem]) -> MacroTargets:
    return MacroTargets(
        calories=sum(meal.calories for meal in meals),
        protein_g=sum(meal.protein_g for meal in meals),
        carbs_g=sum(meal.carbs_g for meal in meals),
        fat_g=sum(meal.fat_g for meal in meals),
    )


def calculate_variance(targets: MacroTargets, actuals: MacroTargets) -> MacroDelta:
    return MacroDelta(
        calories=actuals.calories - targets.calories,
        protein_g=actuals.protein_g - targets.protein_g,
        carbs_g=actuals.carbs_g - targets.carbs_g,
        fat_g=actuals.fat_g - targets.fat_g,
    )


def build_workout_days(goal_mode: GoalMode, equipment: list[str]) -> list[WorkoutDay]:
    bodyweight_only = all(item.lower() == "bodyweight" for item in equipment)

    if goal_mode == "build_muscle":
        focus_map = [
            ("Day 1", "Upper A", ["Bench Press", "Chest Supported Row", "Lateral Raise"]),
            ("Day 2", "Lower A", ["Back Squat", "Romanian Deadlift", "Walking Lunge"]),
            ("Day 3", "Upper B", ["Incline Press", "Pull-Up", "Cable Pressdown"]),
            ("Day 4", "Lower B", ["Leg Press", "Hamstring Curl", "Calf Raise"]),
        ]
    elif goal_mode == "maintain":
        focus_map = [
            ("Day 1", "Push", ["Bench Press", "Overhead Press", "Cable Fly"]),
            ("Day 2", "Pull", ["Row", "Pulldown", "Hammer Curl"]),
            ("Day 3", "Legs", ["Squat", "Split Squat", "Leg Curl"]),
        ]
    else:
        focus_map = [
            ("Day 1", "Full Body A", ["Goblet Squat", "Push-Up", "Row"]),
            ("Day 2", "Full Body B", ["Romanian Deadlift", "Overhead Press", "Lat Pulldown"]),
            ("Day 3", "Conditioning", ["Bike Intervals", "Sled Push", "Core Circuit"]),
        ]

    if bodyweight_only:
        # If the user only has bodyweight, do not leak barbell/machine exercises
        # into the generated split.
        return [
            WorkoutDay(
                day_label=day_label,
                focus=focus,
                exercises=["Bodyweight Squat", "Push-Up", "Walking Lunge", "Plank"],
            )
            for day_label, focus, _ in focus_map
        ]

    return [
        WorkoutDay(day_label=day_label, focus=focus, exercises=exercises)
        for day_label, focus, exercises in focus_map
    ]
