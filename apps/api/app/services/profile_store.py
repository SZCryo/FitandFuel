from uuid import uuid4

from fastapi import HTTPException

from app.models.profile import ProfileCreate, ProfileRecord, ProfileUpdate, utc_now

# MVP-only storage. This resets when the serverless process resets, but it keeps
# the API contract testable before we add a real DB.
_profiles: dict[str, ProfileRecord] = {}


def create_profile(payload: ProfileCreate) -> ProfileRecord:
    user_id = str(uuid4())
    profile = ProfileRecord(user_id=user_id, **payload.model_dump())
    _profiles[user_id] = profile
    return profile


def update_profile(user_id: str, payload: ProfileUpdate) -> ProfileRecord:
    profile = get_profile_or_404(user_id)
    updates = payload.model_dump(exclude_none=True)
    # Partial updates should not blank fields the user did not touch.
    merged = profile.model_copy(update={**updates, "updated_at": utc_now()})
    _profiles[user_id] = merged
    return merged


def get_profile(user_id: str) -> ProfileRecord | None:
    return _profiles.get(user_id)


def get_profile_or_404(user_id: str) -> ProfileRecord:
    profile = get_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def reset_profiles() -> None:
    _profiles.clear()
