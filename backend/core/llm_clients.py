from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Protocol, Sequence


class LLMClientError(RuntimeError):
    pass


class ChatCompletionsClient(Protocol):
    provider_name: str

    def chat_completions(
        self,
        *,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 256,
        temperature: float = 0.7,
        top_p: float | None = None,
    ) -> str:
        ...


@dataclass(frozen=True)
class _HttpResponse:
    payload: Any
    status_code: int


def _extract_error_message(payload: Any, *, default: str) -> str:
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict) and isinstance(err.get("message"), str):
            return err["message"]
        if isinstance(err, str):
            return err
        if isinstance(payload.get("message"), str):
            return payload["message"]
    return default


def _post_json_with_retries(
    *,
    url: str,
    body: Dict[str, Any],
    headers: Dict[str, str],
    timeout_s: float,
    max_attempts: int,
    backoff_factor: float,
    error_prefix: str,
) -> _HttpResponse:
    data = json.dumps(body).encode("utf-8")
    last_error: Exception | None = None

    for attempt in range(1, max(max_attempts, 1) + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                raw = resp.read()
                payload = json.loads(raw.decode("utf-8")) if raw else None
                return _HttpResponse(payload=payload, status_code=getattr(resp, "status", 200))
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            try:
                payload = json.loads(raw.decode("utf-8")) if raw else None
            except Exception:
                payload = None

            status = int(getattr(exc, "code", 0) or 0)
            message = _extract_error_message(payload, default=f"{error_prefix} request failed")
            if status in {408, 429, 500, 502, 503, 504} and attempt < max_attempts:
                time.sleep(min(backoff_factor ** (attempt - 1), 10.0))
                last_error = LLMClientError(f"{status}: {message}")
                continue
            raise LLMClientError(f"{status}: {message}") from exc
        except Exception as exc:
            last_error = exc
            if attempt >= max_attempts:
                break
            time.sleep(min(backoff_factor ** (attempt - 1), 10.0))

    detail = str(last_error) if last_error is not None else "unknown error"
    raise LLMClientError(f"{error_prefix} request failed after retries: {detail}") from last_error


def _extract_openai_style_content(payload: Any, *, provider_name: str) -> str:
    if isinstance(payload, dict):
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            choice0 = choices[0]
            if isinstance(choice0, dict):
                msg = choice0.get("message")
                if isinstance(msg, dict) and isinstance(msg.get("content"), str):
                    return msg["content"]
                if isinstance(choice0.get("text"), str):
                    return choice0["text"]
    raise LLMClientError(f"Unexpected {provider_name} response shape (missing chat content)")


class OpenAICompatibleClient:
    def __init__(
        self,
        *,
        provider_name: str,
        api_key: str,
        base_url: str,
        timeout_s: float,
        max_attempts: int,
        backoff_factor: float,
        user_agent: str = "CalmSphere/1.0",
    ) -> None:
        self.provider_name = provider_name
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s
        self._max_attempts = max_attempts
        self._backoff_factor = backoff_factor
        self._user_agent = user_agent

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

        url = f"{self._base_url}/chat/completions"
        body: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        if top_p is not None:
            body["top_p"] = top_p

        resp = _post_json_with_retries(
            url=url,
            body=body,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": self._user_agent,
            },
            timeout_s=self._timeout_s,
            max_attempts=self._max_attempts,
            backoff_factor=self._backoff_factor,
            error_prefix=self.provider_name,
        )
        return _extract_openai_style_content(resp.payload, provider_name=self.provider_name).strip()


def _to_gemini_contents(messages: Sequence[Dict[str, str]]) -> tuple[str, List[Dict[str, Any]]]:
    system_parts: List[str] = []
    contents: List[Dict[str, Any]] = []
    for msg in messages:
        role = (msg.get("role") or "").strip()
        content = str(msg.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system_parts.append(content)
            continue
        gemini_role = "model" if role == "assistant" else "user"
        contents.append({"role": gemini_role, "parts": [{"text": content}]})
    return ("\n\n".join(system_parts).strip(), contents)


def _extract_gemini_text(payload: Any) -> str:
    if isinstance(payload, dict):
        candidates = payload.get("candidates")
        if isinstance(candidates, list) and candidates:
            content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
            if isinstance(content, dict):
                parts = content.get("parts")
                if isinstance(parts, list):
                    chunks: List[str] = []
                    for p in parts:
                        if isinstance(p, dict) and isinstance(p.get("text"), str):
                            chunks.append(p["text"])
                    out = "".join(chunks).strip()
                    if out:
                        return out
    raise LLMClientError("Unexpected gemini response shape (missing text)")


class GeminiClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        timeout_s: float,
        max_attempts: int,
        backoff_factor: float,
        user_agent: str = "CalmSphere/1.0",
    ) -> None:
        self.provider_name = "gemini"
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s
        self._max_attempts = max_attempts
        self._backoff_factor = backoff_factor
        self._user_agent = user_agent

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

        system_instruction, contents = _to_gemini_contents(messages)
        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_instruction:
            body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        if top_p is not None:
            body["generationConfig"]["topP"] = top_p

        model_path = urllib.parse.quote(model, safe="/-_.")
        url = f"{self._base_url}/v1beta/models/{model_path}:generateContent?key={urllib.parse.quote(self._api_key)}"
        resp = _post_json_with_retries(
            url=url,
            body=body,
            headers={
                "Content-Type": "application/json",
                "User-Agent": self._user_agent,
            },
            timeout_s=self._timeout_s,
            max_attempts=self._max_attempts,
            backoff_factor=self._backoff_factor,
            error_prefix=self.provider_name,
        )
        return _extract_gemini_text(resp.payload)


def _normalize_provider_name(provider: str | None) -> str:
    value = (provider or "").strip().lower()
    if value in {"hf", "huggingface", "hugging_face"}:
        return "huggingface"
    if value in {"groq"}:
        return "groq"
    if value in {"gemini", "google"}:
        return "gemini"
    return "huggingface"


def build_chat_clients(
    *,
    primary_provider: str,
    fallback_providers: Sequence[str],
    hugging_face_api_key: str | None,
    hugging_face_base_url: str,
    groq_api_key: str | None,
    groq_base_url: str,
    gemini_api_key: str | None,
    gemini_base_url: str,
    timeout_s: float,
    max_attempts: int,
    backoff_factor: float,
) -> List[ChatCompletionsClient]:
    ordered = [_normalize_provider_name(primary_provider)] + [
        _normalize_provider_name(p) for p in fallback_providers
    ]
    seen = set()
    providers: List[str] = []
    for item in ordered:
        if item in seen:
            continue
        seen.add(item)
        providers.append(item)

    clients: List[ChatCompletionsClient] = []
    hf_base = (hugging_face_base_url or "https://router.huggingface.co").rstrip("/")
    if hf_base.endswith("/v1"):
        hf_base = hf_base[: -len("/v1")]
    for provider in providers:
        if provider == "huggingface" and hugging_face_api_key:
            clients.append(
                OpenAICompatibleClient(
                    provider_name="huggingface",
                    api_key=hugging_face_api_key,
                    base_url=hf_base + "/v1",
                    timeout_s=timeout_s,
                    max_attempts=max_attempts,
                    backoff_factor=backoff_factor,
                )
            )
            continue
        if provider == "groq" and groq_api_key:
            clients.append(
                OpenAICompatibleClient(
                    provider_name="groq",
                    api_key=groq_api_key,
                    base_url=(groq_base_url or "https://api.groq.com/openai/v1").rstrip("/"),
                    timeout_s=timeout_s,
                    max_attempts=max_attempts,
                    backoff_factor=backoff_factor,
                )
            )
            continue
        if provider == "gemini" and gemini_api_key:
            clients.append(
                GeminiClient(
                    api_key=gemini_api_key,
                    base_url=gemini_base_url or "https://generativelanguage.googleapis.com",
                    timeout_s=timeout_s,
                    max_attempts=max_attempts,
                    backoff_factor=backoff_factor,
                )
            )
            continue
    return clients
