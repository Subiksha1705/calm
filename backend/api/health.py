"""
Health check API routes for Calm Sphere.

This module defines the health check endpoint for monitoring
and load balancer health probes.
"""

from fastapi import APIRouter, HTTPException

from core.config import get_settings
from core.huggingface import check_huggingface_connection, HuggingFaceError


router = APIRouter(
    prefix="",
    tags=["health"]
)


@router.get("/health")
def health_check() -> dict:
    """Health check endpoint.
    
    Returns:
        Simple status response indicating the service is healthy.
    """
    return {"status": "ok"}


@router.get("/health/huggingface")
def huggingface_health_check() -> dict:
    """Optional deep health check for Hugging Face Inference API."""
    settings = get_settings()
    if not settings.hugging_face_api_key:
        raise HTTPException(
            status_code=400,
            detail="Hugging Face API key not configured (set HUGGING_FACE_API_KEY or HF_API_TOKEN).",
        )

    try:
        sample = check_huggingface_connection(
            api_key=settings.hugging_face_api_key,
            model=settings.llm_model_response,
            base_url=settings.hugging_face_base_url,
            timeout_s=settings.hugging_face_timeout_s,
        )
    except HuggingFaceError as e:
        raise HTTPException(status_code=503, detail=f"Hugging Face connection failed: {e}")

    return {"status": "ok", "huggingface": "ok", "sample": sample}


__all__ = ["router"]
