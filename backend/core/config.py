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


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    host: str
    port: int

    cors_allow_origins: list[str]
    cors_allow_credentials: bool
    cors_allow_methods: list[str]
    cors_allow_headers: list[str]

    llm_mock_mode: bool
    llm_model: str
    llm_model_response: str
    llm_model_emotion: str
    llm_model_risk: str
    llm_model_analysis: str

    llm_enable_emotion: bool
    llm_enable_risk: bool

    hugging_face_api_key: str | None
    hugging_face_base_url: str
    hugging_face_timeout_s: float
    hugging_face_max_attempts: int
    hugging_face_backoff_factor: float


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    _load_env()

    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))

    cors_allow_origins = _csv(os.getenv("CORS_ALLOW_ORIGINS", ""))
    cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    cors_allow_methods = _csv(os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS"))
    cors_allow_headers = _csv(os.getenv("CORS_ALLOW_HEADERS", "*"))

    llm_mock_mode = _bool(os.getenv("LLM_MOCK_MODE"), default=True)
    llm_model_response = os.getenv("LLM_MODEL_RESPONSE") or os.getenv("LLM_MODEL") or "meta-llama/Llama-3.2-3B-Instruct"
    llm_model_emotion = os.getenv("LLM_MODEL_EMOTION") or "Qwen/Qwen2.5-7B-Instruct"
    llm_model_risk = os.getenv("LLM_MODEL_RISK") or "openai/gpt-oss-safeguard-20b"
    llm_model_analysis = os.getenv("LLM_MODEL_ANALYSIS") or "meta-llama/Llama-3.1-70B-Instruct"

    # Back-compat: `llm_model` historically meant the single model used for everything.
    llm_model = os.getenv("LLM_MODEL") or llm_model_response

    llm_enable_emotion = _bool(os.getenv("LLM_ENABLE_EMOTION"), default=True)
    llm_enable_risk = _bool(os.getenv("LLM_ENABLE_RISK"), default=True)

    # Support multiple names used across docs/experiments.
    hugging_face_api_key = (
        os.getenv("HUGGING_FACE_API_KEY")
        or os.getenv("HF_API_TOKEN")
        or os.getenv("HF_API_KEY")
    )
    hugging_face_base_url = os.getenv("HUGGING_FACE_BASE_URL", "https://router.huggingface.co")
    hugging_face_timeout_s = float(os.getenv("HUGGING_FACE_TIMEOUT_S", "30"))
    hugging_face_max_attempts = int(os.getenv("HUGGING_FACE_MAX_ATTEMPTS", "3"))
    hugging_face_backoff_factor = float(os.getenv("HUGGING_FACE_BACKOFF_FACTOR", "2"))

    return Settings(
        host=host,
        port=port,
        cors_allow_origins=cors_allow_origins,
        cors_allow_credentials=cors_allow_credentials,
        cors_allow_methods=cors_allow_methods,
        cors_allow_headers=cors_allow_headers,
        llm_mock_mode=llm_mock_mode,
        llm_model=llm_model,
        llm_model_response=llm_model_response,
        llm_model_emotion=llm_model_emotion,
        llm_model_risk=llm_model_risk,
        llm_model_analysis=llm_model_analysis,
        llm_enable_emotion=llm_enable_emotion,
        llm_enable_risk=llm_enable_risk,
        hugging_face_api_key=hugging_face_api_key,
        hugging_face_base_url=hugging_face_base_url,
        hugging_face_timeout_s=hugging_face_timeout_s,
        hugging_face_max_attempts=hugging_face_max_attempts,
        hugging_face_backoff_factor=hugging_face_backoff_factor,
    )
