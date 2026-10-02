from fastapi.testclient import TestClient

from app.main import app
from app.services.plan_store import reset_plans
from app.services.profile_store import reset_profiles

client = TestClient(app)


def setup_function() -> None:
    reset_profiles()
    reset_plans()


def test_generate_plan_for_complete_profile() -> None:
    created = client.post(
        "/api/profile",
        json={
            "name": "Avery",
            "age": 30,
            "height_cm": 183,
            "weight_kg": 86,
            "activity_level": "moderate",
            "goal_mode": "lose_fat",
            "dietary_preferences": ["high_protein"],
            "equipment": ["full_gym"],
        },
    ).json()

    response = client.post("/api/plan/generate", json={"user_id": created["user_id"]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["targets"]["calories"] >= 1400
    assert len(payload["meals"]) == 3
    assert len(payload["workout_days"]) == 3
    assert payload["actuals"]["calories"] == sum(meal["calories"] for meal in payload["meals"])


def test_generate_plan_requires_equipment() -> None:
    created = client.post(
        "/api/profile",
        json={
            "name": "Morgan",
            "age": 26,
            "height_cm": 168,
            "weight_kg": 61,
            "activity_level": "light",
            "goal_mode": "maintain",
            "dietary_preferences": [],
            "equipment": ["bodyweight"],
        },
    ).json()

    client.patch(f"/api/profile/{created['user_id']}", json={"equipment": []})

    response = client.post("/api/plan/generate", json={"user_id": created["user_id"]})

    assert response.status_code == 422
    assert response.json()["detail"] == "Profile must include at least one equipment option"


def test_edit_meal_recomputes_plan_totals() -> None:
    created = client.post(
        "/api/profile",
        json={
            "name": "Taylor",
            "age": 29,
            "height_cm": 180,
            "weight_kg": 82,
            "activity_level": "moderate",
            "goal_mode": "build_muscle",
            "dietary_preferences": [],
            "equipment": ["full_gym"],
        },
    ).json()

    generated = client.post("/api/plan/generate", json={"user_id": created["user_id"]}).json()
    breakfast_before = next(meal for meal in generated["meals"] if meal["meal_type"] == "breakfast")

    response = client.patch(
        f"/api/plan/{created['user_id']}/meal/breakfast",
        json={
            "name": "Custom breakfast",
            "items": ["Eggs", "Toast", "Fruit"],
            "calories": breakfast_before["calories"] + 120,
            "protein_g": breakfast_before["protein_g"] + 8,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    breakfast_after = next(meal for meal in payload["meals"] if meal["meal_type"] == "breakfast")

    assert breakfast_after["name"] == "Custom breakfast"
    assert breakfast_after["items"] == ["Eggs", "Toast", "Fruit"]
    assert payload["actuals"]["calories"] == generated["actuals"]["calories"] + 120
    assert payload["variance"]["calories"] == payload["actuals"]["calories"] - payload["targets"]["calories"]


def test_swap_meal_rotates_content_without_losing_slot_macros() -> None:
    created = client.post(
        "/api/profile",
        json={
            "name": "Casey",
            "age": 33,
            "height_cm": 177,
            "weight_kg": 78,
            "activity_level": "high",
            "goal_mode": "maintain",
            "dietary_preferences": ["vegetarian"],
            "equipment": ["dumbbells"],
        },
    ).json()

    generated = client.post("/api/plan/generate", json={"user_id": created["user_id"]}).json()
    lunch_before = next(meal for meal in generated["meals"] if meal["meal_type"] == "lunch")

    response = client.post(f"/api/plan/{created['user_id']}/meal/lunch/swap")

    assert response.status_code == 200
    payload = response.json()
    lunch_after = next(meal for meal in payload["meals"] if meal["meal_type"] == "lunch")

    assert lunch_after["name"] != lunch_before["name"]
    assert lunch_after["items"] != lunch_before["items"]
    assert lunch_after["calories"] == lunch_before["calories"]
    assert payload["actuals"] == generated["actuals"]
