"""
Hugging Face Router client utilities.

Implements a small, dependency-free HTTP client (urllib) with retries/backoff.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


class HuggingFaceError(RuntimeError):
    pass


@dataclass(frozen=True)
class HuggingFaceResponse:
    payload: Any
    status_code: int


def _extract_error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        # Router / OpenAI-compatible error shape:
        # {"error": {"message": "...", ...}}
        if isinstance(payload.get("error"), dict) and isinstance(payload["error"].get("message"), str):
            return payload["error"]["message"]
        if isinstance(payload.get("error"), str):
            return payload["error"]
        if isinstance(payload.get("message"), str):
            return payload["message"]
    return "Hugging Face request failed"


def _extract_chat_content(payload: Any) -> str:
    # Router OpenAI-compatible /v1/chat/completions shape:
    # {"choices":[{"message":{"content":"..."}}], ...}
    if isinstance(payload, dict):
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            choice0 = choices[0]
            if isinstance(choice0, dict):
                msg = choice0.get("message")
                if isinstance(msg, dict) and isinstance(msg.get("content"), str):
                    return msg["content"]
                # Some providers may return `text` in choices.
                if isinstance(choice0.get("text"), str):
                    return choice0["text"]
    raise HuggingFaceError("Unexpected Hugging Face response shape (missing chat content).")


class HuggingFaceInferenceClient:
    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://router.huggingface.co",
        timeout_s: float = 30.0,
        max_attempts: int = 3,
        backoff_factor: float = 2.0,
        user_agent: str = "CalmSphere/1.0",
    ) -> None:
        self._api_key = api_key
        self._base_url = self._normalize_base_url(base_url)
        self._timeout_s = timeout_s
        self._max_attempts = max_attempts
        self._backoff_factor = backoff_factor
        self._user_agent = user_agent

    @staticmethod
    def _normalize_base_url(base_url: str) -> str:
        base = (base_url or "https://router.huggingface.co").rstrip("/")
        # Users sometimes set HUGGING_FACE_BASE_URL=https://router.huggingface.co/v1
        if base.endswith("/v1"):
            base = base[: -len("/v1")]
        return base.rstrip("/")

    def _post_json(
        self,
        *,
        url: str,
        body: Dict[str, Any],
    ) -> HuggingFaceResponse:
        data = json.dumps(body).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "User-Agent": self._user_agent,
        }

        attempt = 0
        last_error: Exception | None = None
        while attempt < max(self._max_attempts, 1):
            attempt += 1
            try:
                req = urllib.request.Request(url, data=data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=self._timeout_s) as resp:
                    raw = resp.read()
                    payload = json.loads(raw.decode("utf-8")) if raw else None
                    return HuggingFaceResponse(payload=payload, status_code=getattr(resp, "status", 200))
            except urllib.error.HTTPError as e:
                raw = e.read()
                try:
                    payload = json.loads(raw.decode("utf-8")) if raw else None
                except Exception:
                    payload = None

                status = int(getattr(e, "code", 0) or 0)
                message = _extract_error_message(payload)

                # Retry on transient-ish errors.
                if status in {429, 500, 502, 503, 504} and attempt < self._max_attempts:
                    sleep_s = (self._backoff_factor ** (attempt - 1))
                    # HF sometimes returns an estimated load time on 503.
                    if isinstance(payload, dict) and isinstance(payload.get("estimated_time"), (int, float)):
                        sleep_s = max(float(payload["estimated_time"]), sleep_s)
                    time.sleep(min(sleep_s, 10.0))
                    last_error = HuggingFaceError(f"{status}: {message}")
                    continue

                raise HuggingFaceError(f"{status}: {message}") from e
            except Exception as e:
                last_error = e
                if attempt >= self._max_attempts:
                    break
                time.sleep(min((self._backoff_factor ** (attempt - 1)), 10.0))

        detail = f"{last_error}" if last_error is not None else "unknown error"
        raise HuggingFaceError(f"Hugging Face request failed after retries: {detail}") from last_error

    def chat_completions(
        self,
        *,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float | None = None,
    ) -> str:
        if not model:
            raise ValueError("model is required")
        if not messages:
            raise ValueError("messages is required")

        url = f"{self._base_url}/v1/chat/completions"
        body: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        if top_p is not None:
            body["top_p"] = top_p

        resp = self._post_json(url=url, body=body)
        return _extract_chat_content(resp.payload).strip()


def check_huggingface_connection(
    *, api_key: str, model: str, base_url: str = "https://router.huggingface.co", timeout_s: float = 30.0
) -> str:
    """Returns a short generated string if the connection works."""
    client = HuggingFaceInferenceClient(
        api_key, base_url=base_url, timeout_s=timeout_s, max_attempts=2, backoff_factor=2.0
    )
    return client.chat_completions(
        model=model,
        messages=[{"role": "user", "content": "Say 'ok' and nothing else."}],
        max_tokens=8,
        temperature=0.0,
    )
