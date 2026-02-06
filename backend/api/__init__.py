"""
API routes package for Calm Sphere.

This package contains all REST API route definitions:
- health.py: Health check endpoints
- threads.py: Thread management endpoints
- chat.py: Chat message endpoints
"""

from api.health import router as health_router
from api.threads import router as threads_router
from api.chat import router as chat_router

__all__ = [
    "health_router",
    "threads_router", 
    "chat_router",
]
