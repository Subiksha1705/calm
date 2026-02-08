#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict


def _bootstrap_import_path() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))


def _extract_first_json_object(text: str) -> Dict[str, Any]:
    # Very small, dependency-free best-effort parser: find the first {...} block.
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON object found")
    return json.loads(text[start : end + 1])


def main() -> int:
    _bootstrap_import_path()

    from core.config import get_settings
    from core.huggingface import HuggingFaceInferenceClient, HuggingFaceError

    settings = get_settings()
    api_key = settings.hugging_face_api_key
    if not api_key:
        print("Missing Hugging Face API key. Set HUGGING_FACE_API_KEY (or HF_API_TOKEN/HF_API_KEY).", file=sys.stderr)
        return 2

    client = HuggingFaceInferenceClient(
        api_key,
        base_url=settings.hugging_face_base_url,
        timeout_s=settings.hugging_face_timeout_s,
        max_attempts=settings.hugging_face_max_attempts,
        backoff_factor=settings.hugging_face_backoff_factor,
    )

    failures: list[str] = []

    # 1) Response model
    try:
        out = client.chat_completions(
            model=settings.llm_model_response,
            messages=[{"role": "user", "content": "Say 'ok' and nothing else."}],
            max_tokens=8,
            temperature=0.0,
        )
        if not out.strip():
            raise ValueError("empty response")
        print(f"OK response model: {settings.llm_model_response!r} -> {out.strip()!r}")
    except Exception as e:
        failures.append(f"response({settings.llm_model_response}): {e}")

    # 2) Emotion model
    emotion_system = (
        "You are an emotion classifier.\n"
        "Return ONLY valid JSON with this schema:\n"
        '{"label":"sad|anxious|angry|neutral|happy|overwhelmed|lonely|stressed|other","confidence":0.0}\n'
        "No extra keys, no markdown, no explanations."
    )
    try:
        out = client.chat_completions(
            model=settings.llm_model_emotion,
            messages=[
                {"role": "system", "content": emotion_system},
                {"role": "user", "content": "I feel very lonely lately."},
            ],
            max_tokens=240,
            temperature=0.0,
        )
        payload = _extract_first_json_object(out)
        if not isinstance(payload.get("label"), str):
            raise ValueError(f"missing label in {payload}")
        if not isinstance(payload.get("confidence"), (int, float)):
            raise ValueError(f"missing confidence in {payload}")
        print(f"OK emotion model: {settings.llm_model_emotion!r} -> {payload}")
    except Exception as e:
        failures.append(f"emotion({settings.llm_model_emotion}): {e}")

    # 3) Risk model
    risk_system = (
        "You are a safety classifier for a mental health support chatbot.\n"
        "Return ONLY valid JSON with this schema:\n"
        '{"toxicity":0.0,"self_harm":0.0,"harassment":0.0,"sexual":0.0,"violence":0.0,"overall_risk":"low|medium|high"}\n'
        "No extra keys, no markdown, no explanations."
    )
    try:
        out = client.chat_completions(
            model=settings.llm_model_risk,
            messages=[
                {"role": "system", "content": risk_system},
                {"role": "user", "content": "New message: I want to hurt myself."},
            ],
            max_tokens=600,
            temperature=0.0,
        )
        payload = _extract_first_json_object(out)
        if payload.get("overall_risk") not in {"low", "medium", "high"}:
            raise ValueError(f"bad overall_risk in {payload}")
        print(f"OK risk model: {settings.llm_model_risk!r} -> overall_risk={payload.get('overall_risk')!r}")
    except Exception as e:
        failures.append(f"risk({settings.llm_model_risk}): {e}")

    # 4) Analysis model
    analysis_system = (
        "You are an analysis assistant.\n"
        "Summarize key themes and 3 actionable next steps.\n"
        "Be concise and structured with bullet points."
    )
    try:
        out = client.chat_completions(
            model=settings.llm_model_analysis,
            messages=[
                {"role": "system", "content": analysis_system},
                {
                    "role": "user",
                    "content": (
                        "I’ve been sleeping poorly, skipping meals, and I feel overwhelmed by school. "
                        "I’m also avoiding friends and I’m worried I’m falling behind."
                    ),
                },
            ],
            max_tokens=220,
            temperature=0.2,
        )
        if not out.strip():
            raise ValueError("empty analysis")
        print(f"OK analysis model: {settings.llm_model_analysis!r} -> {out.strip()[:120]!r}...")
    except Exception as e:
        failures.append(f"analysis({settings.llm_model_analysis}): {e}")

    if failures:
        print("\nFAILURES:", file=sys.stderr)
        for f in failures:
            print(f"- {f}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
