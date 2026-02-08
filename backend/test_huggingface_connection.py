#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _bootstrap_import_path() -> None:
    # Allow running from repo root: `python backend/scripts/test_huggingface_connection.py`
    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))


def main() -> int:
    _bootstrap_import_path()

    from core.config import get_settings
    from core.huggingface import check_huggingface_connection, HuggingFaceError

    parser = argparse.ArgumentParser(description="Test Hugging Face Router connectivity.")
    parser.add_argument("--model", default=None, help="Override model name (defaults to LLM_MODEL).")
    args = parser.parse_args()

    settings = get_settings()
    api_key = settings.hugging_face_api_key
    model = args.model or settings.llm_model_response

    if not api_key:
        print("Missing Hugging Face API key. Set HUGGING_FACE_API_KEY (or HF_API_TOKEN).", file=sys.stderr)
        return 2

    try:
        sample = check_huggingface_connection(
            api_key=api_key,
            model=model,
            timeout_s=settings.hugging_face_timeout_s,
        )
    except HuggingFaceError as e:
        print(f"FAIL: Hugging Face connection failed for model '{model}': {e}", file=sys.stderr)
        return 1

    print(f"OK: Hugging Face connected (model='{model}'). Sample response: {sample!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
