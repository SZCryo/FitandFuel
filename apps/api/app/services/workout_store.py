from collections import defaultdict
from datetime import date
from uuid import uuid4

from fastapi import HTTPException

from app.models.history import HistoryCalendarMarker, HistoryCalendarResponse, HistoryDayResponse, NutritionSummary
from app.models.workout import (
    WorkoutCompleteRequest,
    WorkoutSessionRecord,
    WorkoutSessionStartRequest,
    WorkoutSetInput,
    WorkoutSetRecord,
    utc_now,
)

# Session IDs are indexed by user because the history endpoints need fast "show
# me this user's month/day" lookups without walking every session every time.
_sessions_by_id: dict[str, WorkoutSessionRecord] = {}
_session_ids_by_user: dict[str, list[str]] = defaultdict(list)


def start_session(payload: WorkoutSessionStartRequest) -> WorkoutSessionRecord:
    session_id = str(uuid4())
    session = WorkoutSessionRecord(session_id=session_id, **payload.model_dump())
    _sessions_by_id[session_id] = session
    _session_ids_by_user[payload.user_id].append(session_id)
    return session


def log_set(session_id: str, payload: WorkoutSetInput) -> WorkoutSessionRecord:
    session = get_session_or_404(session_id)
    ensure_active(session)

    updated_sets = [*session.sets, WorkoutSetRecord(**payload.model_dump())]
    updated = session.model_copy(update={"sets": updated_sets})
    _sessions_by_id[session_id] = updated
    return updated


def complete_session(session_id: str, payload: WorkoutCompleteRequest) -> WorkoutSessionRecord:
    session = get_session_or_404(session_id)
    ensure_active(session)

    updated = session.model_copy(
        update={
            "status": "completed",
            "duration_seconds": payload.duration_seconds,
            "completed_at": utc_now(),
        }
    )
    _sessions_by_id[session_id] = updated
    return updated


def get_history_calendar(user_id: str, month: str) -> HistoryCalendarResponse:
    month_prefix = f"{month}-"
    sessions = [session for session in list_sessions(user_id) if session.session_date.isoformat().startswith(month_prefix)]
    grouped: dict[date, list[WorkoutSessionRecord]] = defaultdict(list)

    for session in sessions:
        grouped[session.session_date].append(session)

    markers = [
        HistoryCalendarMarker(
            date=session_date,
            has_workout_data=True,
            workout_count=len(day_sessions),
        )
        for session_date, day_sessions in sorted(grouped.items())
    ]

    return HistoryCalendarResponse(user_id=user_id, month=month, markers=markers)


def get_history_day(user_id: str, target_date: date) -> HistoryDayResponse:
    workouts = [session for session in list_sessions(user_id) if session.session_date == target_date]
    return HistoryDayResponse(
        user_id=user_id,
        date=target_date,
        # Nutrition is currently owned by the web demo session. The field stays
        # here so the response shape is already ready for a real daily summary.
        nutrition=NutritionSummary(),
        workouts=workouts,
    )


def list_sessions(user_id: str) -> list[WorkoutSessionRecord]:
    return [_sessions_by_id[session_id] for session_id in _session_ids_by_user.get(user_id, [])]


def get_session_or_404(session_id: str) -> WorkoutSessionRecord:
    session = _sessions_by_id.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return session


def ensure_active(session: WorkoutSessionRecord) -> None:
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Workout session is already completed")


def reset_sessions() -> None:
    _sessions_by_id.clear()
    _session_ids_by_user.clear()
