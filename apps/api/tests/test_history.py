from fastapi.testclient import TestClient

from app.main import app
from app.services.workout_store import reset_sessions

client = TestClient(app)


def setup_function() -> None:
    reset_sessions()


def test_history_calendar_returns_markers() -> None:
    client.post(
        "/api/workout/session/start",
        json={
            "user_id": "user-3",
            "session_date": "2026-04-15",
            "focus": "Upper",
            "exercises": ["Row"],
        },
    )

    response = client.get("/api/history/calendar", params={"user_id": "user-3", "month": "2026-04"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["month"] == "2026-04"
    assert payload["markers"][0]["workout_count"] == 1


def test_history_day_returns_workouts() -> None:
    session_id = client.post(
        "/api/workout/session/start",
        json={
            "user_id": "user-4",
            "session_date": "2026-04-18",
            "focus": "Pull",
            "exercises": ["Pull-Up"],
        },
    ).json()["session_id"]

    client.post(
        f"/api/workout/session/{session_id}/set",
        json={
            "exercise_name": "Pull-Up",
            "set_index": 1,
            "reps": 10,
            "weight": 0,
        },
    )

    response = client.get("/api/history/day", params={"user_id": "user-4", "date": "2026-04-18"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["date"] == "2026-04-18"
    assert len(payload["workouts"]) == 1
    assert payload["workouts"][0]["session_id"] == session_id
