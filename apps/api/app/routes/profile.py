from fastapi import APIRouter

from app.models.profile import ProfileCreate, ProfileRecord, ProfileUpdate
from app.services.profile_store import create_profile, update_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("", response_model=ProfileRecord, status_code=201)
def create_profile_route(payload: ProfileCreate) -> ProfileRecord:
    return create_profile(payload)


@router.patch("/{user_id}", response_model=ProfileRecord)
def update_profile_route(user_id: str, payload: ProfileUpdate) -> ProfileRecord:
    return update_profile(user_id, payload)
