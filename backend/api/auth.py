from __future__ import annotations

from fastapi import APIRouter, Depends

from core.auth import AuthenticatedUser, require_user
from core.user_store import upsert_login_profile, user_store
from schemas.auth import MeResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
def me(user: AuthenticatedUser = Depends(require_user)) -> MeResponse:
    stored = user_store.get_user(user.uid)
    if not stored:
        stored = upsert_login_profile(uid=user.uid, email=user.email, name=user.name, picture=user.picture)

    return MeResponse(
        uid=user.uid,
        email=stored.get("email") or user.email,
        display_name=stored.get("name") or user.name,
        photo_url=stored.get("photo_url") or user.picture,
    )
