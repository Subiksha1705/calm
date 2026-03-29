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


def update_user_insights(*, uid: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    """Update rolling insight aggregates for a user profile."""
    if not insights:
        return user_store.get_user(uid) or {}

    existing = user_store.get_user(uid) or {}
    summary = existing.get("insights_summary") if isinstance(existing.get("insights_summary"), dict) else {}
    count = int(summary.get("count", 0) or 0)

    def _avg_update(avg_map: Dict[str, Any], new_map: Dict[str, Any], keys: list[str]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for key in keys:
            old_val = float(avg_map.get(key, 0.0) or 0.0)
            new_val = float(new_map.get(key, 0.0) or 0.0)
            out[key] = (old_val * count + new_val) / float(count + 1)
        return out

    def _bump_counts(count_map: Dict[str, Any], items: list[str], cap: int = 12) -> Dict[str, int]:
        out: Dict[str, int] = {}
        for key, value in (count_map or {}).items():
            try:
                out[str(key)] = int(value)
            except Exception:
                continue
        for item in items:
            if not item:
                continue
            out[item] = out.get(item, 0) + 1
        if len(out) > cap:
            out = dict(sorted(out.items(), key=lambda kv: kv[1], reverse=True)[:cap])
        return out

    risk = insights.get("risk") if isinstance(insights.get("risk"), dict) else {}
    risk_avg = _avg_update(summary.get("risk_avg", {}), risk, ["toxicity", "self_harm", "harassment", "sexual", "violence"])
    overall_counts = _bump_counts(summary.get("overall_risk_counts", {}), [str(risk.get("overall_risk") or "")], cap=3)

    emotion = insights.get("emotion") if isinstance(insights.get("emotion"), dict) else {}
    emotion_counts = _bump_counts(summary.get("emotion_counts", {}), [str(emotion.get("label") or "")], cap=10)

    violence = insights.get("violence_intent") if isinstance(insights.get("violence_intent"), dict) else {}
    violence_counts = _bump_counts(summary.get("violence_intent_counts", {}), [str(violence.get("other_directed_violence") or "")], cap=3)

    strengths = insights.get("strengths") if isinstance(insights.get("strengths"), list) else []
    strength_counts = _bump_counts(summary.get("strength_counts", {}), [str(s) for s in strengths], cap=12)

    patterns = insights.get("patterns") if isinstance(insights.get("patterns"), dict) else {}
    pattern_items: list[str] = []
    for key in ("emotions", "reactions", "values", "themes"):
        raw = patterns.get(key)
        if isinstance(raw, list):
            pattern_items.extend([str(v) for v in raw])
    pattern_counts = _bump_counts(summary.get("pattern_counts", {}), pattern_items, cap=12)

    updated = {
        "count": count + 1,
        "risk_avg": risk_avg,
        "overall_risk_counts": overall_counts,
        "emotion_counts": emotion_counts,
        "violence_intent_counts": violence_counts,
        "strength_counts": strength_counts,
        "pattern_counts": pattern_counts,
        "last_updated": _utc_now_iso(),
    }
    return user_store.upsert_user(uid, {"insights_summary": updated})
