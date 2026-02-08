"""
User profile persistence.

When Firebase is enabled (USE_FIREBASE=true), this upserts a user profile doc:
  users/{uid}

This module must not crash at import time if Firebase env vars are missing, to
support local development and uvicorn reload. Initialization happens in
`init_user_store_from_env()` from `main.py` lifespan.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from core.firebase_app import ensure_firebase_admin_initialized


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class MemoryUserStore:
    def __init__(self) -> None:
        self._users: Dict[str, Dict[str, Any]] = {}

    def upsert_user(self, uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        existing = self._users.get(uid, {})
        merged = {**existing, **data}
        self._users[uid] = merged
        return merged

    def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        return self._users.get(uid)


class FirebaseUserStore:
    def __init__(self) -> None:
        ensure_firebase_admin_initialized()
        from firebase_admin import firestore

        self._db = firestore.client()

    def upsert_user(self, uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
        ref = self._db.collection("users").document(uid)
        ref.set(data, merge=True)
        snap = ref.get()
        return snap.to_dict() or data

    def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        snap = self._db.collection("users").document(uid).get()
        if not snap.exists:
            return None
        return snap.to_dict()


class UserStoreProxy:
    def __init__(self, store: Any):
        self._store = store

    def set_store(self, store: Any) -> None:
        self._store = store

    def __getattr__(self, name: str) -> Any:
        return getattr(self._store, name)


user_store = UserStoreProxy(MemoryUserStore())


def init_user_store_from_env() -> str:
    """Initialize the global user store from env vars.

    Returns:
        "firebase" or "memory"
    """
    use_firebase = os.getenv("USE_FIREBASE", "false").lower() == "true"
    if not use_firebase:
        user_store.set_store(MemoryUserStore())
        return "memory"

    # If firebase init fails, optionally fall back to memory.
    fallback = os.getenv("FIREBASE_FALLBACK_TO_MEMORY", "false").lower() == "true"
    try:
        user_store.set_store(FirebaseUserStore())
        return "firebase"
    except Exception:
        if not fallback:
            raise
        user_store.set_store(MemoryUserStore())
        return "memory"


def upsert_login_profile(
    *,
    uid: str,
    email: Optional[str],
    name: Optional[str],
    picture: Optional[str],
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "uid": uid,
        "email": email,
        "name": name,
        "photo_url": picture,
        "last_login_at": _utc_now_iso(),
    }
    existing = user_store.get_user(uid)
    if not existing:
        payload["created_at"] = payload["last_login_at"]
    return user_store.upsert_user(uid, payload)

