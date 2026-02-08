"""
Shared Firebase Admin initialization.

Used by both Firestore storage and auth verification.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials


def ensure_firebase_admin_initialized() -> None:
    if firebase_admin._apps:
        return

    firebase_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if firebase_json:
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        return

    # Local development fallback: allow file-based credentials.
    backend_root = Path(__file__).resolve().parents[1]
    configured = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
    path = Path(configured)
    if not path.is_absolute():
        path = backend_root / path

    if path.exists():
        firebase_admin.initialize_app(credentials.Certificate(str(path)))
        return

    raise RuntimeError(
        "Firebase credentials not configured. Set FIREBASE_CREDENTIALS_JSON (Render) "
        "or FIREBASE_CREDENTIALS_PATH (local dev)."
    )
