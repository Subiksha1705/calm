"""
Shared Firebase Admin initialization.

Used by both Firestore storage and auth verification.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import firebase_admin
from firebase_admin import credentials


def ensure_firebase_admin_initialized(credentials_path: Optional[str] = None) -> None:
    if firebase_admin._apps:
        return

    backend_root = Path(__file__).resolve().parents[1]
    configured = credentials_path or os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_key.json")
    path = Path(configured)
    if not path.is_absolute():
        path = backend_root / path

    if not path.exists():
        raise FileNotFoundError(f"Firebase credentials file not found: {path}")

    firebase_admin.initialize_app(credentials.Certificate(str(path)))

