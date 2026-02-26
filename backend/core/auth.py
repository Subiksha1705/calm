"""
Firebase Auth token verification for Calm Sphere.

Frontend obtains an ID token via Firebase Auth and sends:
  Authorization: Bearer <firebase_id_token>
"""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from firebase_admin import auth as firebase_auth

from core.firebase_app import ensure_firebase_admin_initialized

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthenticatedUser:
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


_bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[AuthenticatedUser]:
    if not credentials:
        return None
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unsupported authorization scheme")

    ensure_firebase_admin_initialized()
    try:
        decoded = firebase_auth.verify_id_token(
            credentials.credentials,
            check_revoked=False,
            clock_skew_seconds=60,
        )
    except Exception as exc:
        logger.warning("Firebase ID token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired auth token")

    uid = str(decoded.get("uid") or decoded.get("sub") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid auth token payload")

    return AuthenticatedUser(
        uid=uid,
        email=decoded.get("email"),
        name=decoded.get("name"),
        picture=decoded.get("picture"),
    )


def require_user(user: Optional[AuthenticatedUser] = Depends(get_optional_user)) -> AuthenticatedUser:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
