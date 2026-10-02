from fastapi.testclient import TestClient

from app.main import app
from app.services.profile_store import reset_profiles

client = TestClient(app)


def setup_function() -> None:
    reset_profiles()


def test_create_profile() -> None:
    response = client.post(
        "/api/profile",
        json={
            "name": "Avery",
            "age": 28,
            "height_cm": 180,
            "weight_kg": 82,
            "activity_level": "moderate",
            "goal_mode": "build_muscle",
            "dietary_preferences": ["high_protein"],
            "equipment": ["full_gym"],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"]
    assert payload["name"] == "Avery"
    assert payload["goal_mode"] == "build_muscle"


def test_update_profile() -> None:
    created = client.post(
        "/api/profile",
        json={
            "name": "Jordan",
            "age": 24,
            "height_cm": 175,
            "weight_kg": 70,
            "activity_level": "light",
            "goal_mode": "maintain",
            "dietary_preferences": [],
            "equipment": ["bodyweight"],
        },
    ).json()

    response = client.patch(
        f"/api/profile/{created['user_id']}",
        json={"name": "Jordan Lee", "weight_kg": 73, "activity_level": "moderate"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Jordan Lee"
    assert payload["weight_kg"] == 73
    assert payload["activity_level"] == "moderate"
