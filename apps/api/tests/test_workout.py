from fastapi.testclient import TestClient

from app.main import app
from app.services.workout_store import reset_sessions

client = TestClient(app)


def setup_function() -> None:
    reset_sessions()


def test_workout_session_lifecycle() -> None:
    started = client.post(
        "/api/workout/session/start",
        json={
            "user_id": "user-1",
            "session_date": "2026-04-21",
            "focus": "Push",
            "exercises": ["Bench Press", "Overhead Press"],
        },
    )

    assert started.status_code == 201
    session_id = started.json()["session_id"]

    logged = client.post(
        f"/api/workout/session/{session_id}/set",
        json={
            "exercise_name": "Bench Press",
            "set_index": 1,
            "reps": 8,
            "weight": 185,
        },
    )

    assert logged.status_code == 200
    assert len(logged.json()["sets"]) == 1

    completed = client.post(
        f"/api/workout/session/{session_id}/complete",
        json={"duration_seconds": 3120},
    )

    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    assert completed.json()["duration_seconds"] == 3120


def test_completed_session_rejects_new_sets() -> None:
    session_id = client.post(
        "/api/workout/session/start",
        json={
            "user_id": "user-2",
            "session_date": "2026-04-22",
            "focus": "Legs",
            "exercises": ["Squat"],
        },
    ).json()["session_id"]

    client.post(f"/api/workout/session/{session_id}/complete", json={"duration_seconds": 1800})

    response = client.post(
        f"/api/workout/session/{session_id}/set",
        json={
            "exercise_name": "Squat",
            "set_index": 1,
            "reps": 5,
            "weight": 225,
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Workout session is already completed"
