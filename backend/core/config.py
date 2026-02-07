"""
Application configuration for Calm Sphere backend.

Loads environment variables from `backend/.env` (development) and exposes a
typed settings object for reuse across the codebase.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


def _load_env() -> None:
    # Load backend/.env if present (keeps production env precedence).
    backend_root = Path(__file__).resolve().parents[1]
    env_path = backend_root / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)


def _csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    host: str
    port: int

    cors_allow_origins: list[str]
    cors_allow_credentials: bool
    cors_allow_methods: list[str]
    cors_allow_headers: list[str]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    _load_env()

    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))

    cors_allow_origins = _csv(os.getenv("CORS_ALLOW_ORIGINS", ""))
    cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    cors_allow_methods = _csv(os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS"))
    cors_allow_headers = _csv(os.getenv("CORS_ALLOW_HEADERS", "*"))

    return Settings(
        host=host,
        port=port,
        cors_allow_origins=cors_allow_origins,
        cors_allow_credentials=cors_allow_credentials,
        cors_allow_methods=cors_allow_methods,
        cors_allow_headers=cors_allow_headers,
    )

