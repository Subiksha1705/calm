#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import List


def _bootstrap_import_path() -> None:
    # Allow running from repo root: python backend/scripts/check_model_availability.py
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))


def _csv(value: str) -> List[str]:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def _list_gemini_models(base_url: str, api_key: str) -> List[str]:
    base = base_url.rstrip("/")
    url = f"{base}/v1beta/models?key={urllib.parse.quote(api_key)}"
    req = urllib.request.Request(url, headers={"User-Agent": "CalmSphere/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    models = payload.get("models", [])
    out: List[str] = []
    for m in models:
        if not isinstance(m, dict):
            continue
        methods = m.get("supportedGenerationMethods") or []
        if "generateContent" not in methods:
            continue
        name = m.get("name")
        if isinstance(name, str) and name:
            out.append(name.removeprefix("models/"))
    return out


def main() -> int:
    _bootstrap_import_path()

    from core.config import get_settings
    from core.llm_clients import build_chat_clients

    parser = argparse.ArgumentParser(
        description="Check model availability/connectivity for configured LLM providers."
    )
    parser.add_argument(
        "--provider",
        default="auto",
        choices=["auto", "all", "gemini", "groq", "huggingface"],
        help="Provider to test (default: auto -> configured order).",
    )
    parser.add_argument(
        "--models",
        default="",
        help="Comma-separated model IDs to test. Defaults to configured response/emotion/risk/analysis models.",
    )
    parser.add_argument(
        "--list-gemini-models",
        action="store_true",
        help="List models available to current Gemini key (generateContent-capable).",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=12,
        help="Max tokens for probe request (default: 12).",
    )
    args = parser.parse_args()

    settings = get_settings()
    configured_models = [
        settings.llm_model_response,
        settings.llm_model_emotion,
        settings.llm_model_risk,
        settings.llm_model_analysis,
    ]
    models = _csv(args.models) if args.models else []
    if not models:
        # Preserve order and dedupe.
        seen = set()
        for m in configured_models:
            if m not in seen:
                seen.add(m)
                models.append(m)

    primary = settings.llm_provider
    fallback = settings.llm_fallback_providers
    if args.provider == "all":
        primary = "gemini"
        fallback = ["groq", "huggingface"]
    elif args.provider in {"gemini", "groq", "huggingface"}:
        primary = args.provider
        fallback = []

    clients = build_chat_clients(
        primary_provider=primary,
        fallback_providers=fallback,
        hugging_face_api_key=settings.hugging_face_api_key,
        hugging_face_base_url=settings.hugging_face_base_url,
        groq_api_key=settings.groq_api_key,
        groq_base_url=settings.groq_base_url,
        gemini_api_key=settings.gemini_api_key,
        gemini_base_url=settings.gemini_base_url,
        timeout_s=settings.hugging_face_timeout_s,
        max_attempts=1,
        backoff_factor=settings.hugging_face_backoff_factor,
    )

    if args.list_gemini_models:
        gem_key = settings.gemini_api_key
        if not gem_key:
            print("Gemini key missing. Set GEMINI_API_KEY or GOOGLE_API_KEY.", file=sys.stderr)
            return 2
        try:
            available = _list_gemini_models(settings.gemini_base_url, gem_key)
        except Exception as exc:
            print(f"FAIL: could not list Gemini models: {exc}", file=sys.stderr)
            return 1
        print("Gemini models (generateContent):")
        for name in available:
            print(f"- {name}")
        # Continue with probes unless user passed only listing intent.
        if not clients:
            return 0

    if not clients:
        print("No provider clients available. Check API keys in backend/.env.", file=sys.stderr)
        return 2

    print("provider_order=", [c.provider_name for c in clients])
    print("models=", models)

    failures: list[str] = []
    for client in clients:
        for model in models:
            try:
                out = client.chat_completions(
                    model=model,
                    messages=[{"role": "user", "content": "Reply with exactly: ok"}],
                    max_tokens=max(1, args.max_tokens),
                    temperature=0.0,
                )
                print(f"OK: provider={client.provider_name} model={model} -> {out!r}")
            except Exception as exc:
                msg = f"FAIL: provider={client.provider_name} model={model} -> {exc}"
                print(msg)
                failures.append(msg)

    if failures:
        print(f"\n{len(failures)} checks failed.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

