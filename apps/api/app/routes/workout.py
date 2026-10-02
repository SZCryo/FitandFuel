from fastapi import APIRouter

from app.models.workout import (
    WorkoutCompleteRequest,
    WorkoutSessionRecord,
    WorkoutSessionStartRequest,
    WorkoutSetInput,
)
from app.services.workout_store import complete_session, log_set, start_session

router = APIRouter(prefix="/api/workout/session", tags=["workout"])


@router.post("/start", response_model=WorkoutSessionRecord, status_code=201)
def start_session_route(payload: WorkoutSessionStartRequest) -> WorkoutSessionRecord:
    return start_session(payload)


@router.post("/{session_id}/set", response_model=WorkoutSessionRecord)
def log_set_route(session_id: str, payload: WorkoutSetInput) -> WorkoutSessionRecord:
    return log_set(session_id, payload)


@router.post("/{session_id}/complete", response_model=WorkoutSessionRecord)
def complete_session_route(session_id: str, payload: WorkoutCompleteRequest) -> WorkoutSessionRecord:
    return complete_session(session_id, payload)
