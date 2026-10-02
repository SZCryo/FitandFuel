from datetime import date

from fastapi import APIRouter, Query

from app.models.history import HistoryCalendarResponse, HistoryDayResponse
from app.services.workout_store import get_history_calendar, get_history_day

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/calendar", response_model=HistoryCalendarResponse)
def history_calendar_route(user_id: str = Query(...), month: str = Query(...)) -> HistoryCalendarResponse:
    return get_history_calendar(user_id, month)


@router.get("/day", response_model=HistoryDayResponse)
def history_day_route(user_id: str = Query(...), date_value: date = Query(..., alias="date")) -> HistoryDayResponse:
    return get_history_day(user_id, date_value)
