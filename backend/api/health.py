"""
Health check API routes for Calm Sphere.

This module defines the health check endpoint for monitoring
and load balancer health probes.
"""

from fastapi import APIRouter


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


__all__ = ["router"]
