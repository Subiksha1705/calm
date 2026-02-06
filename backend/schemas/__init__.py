"""
Pydantic schemas package for Calm Sphere.

This package contains all data models:
- chat.py: Message and chat request/response models
- thread.py: Thread request/response models
"""

from schemas.chat import (
    MessageRole,
    Message,
    ChatRequest,
    ChatResponse,
    ErrorResponse,
)
from schemas.thread import (
    CreateThreadRequest,
    CreateThreadResponse,
    ThreadResponse,
    ListThreadsResponse,
    ThreadListItem,
    ThreadMessagesResponse,
)

__all__ = [
    # Chat models
    "MessageRole",
    "Message",
    "ChatRequest",
    "ChatResponse",
    "ErrorResponse",
    # Thread models
    "CreateThreadRequest",
    "CreateThreadResponse",
    "ThreadResponse",
    "ListThreadsResponse",
    "ThreadListItem",
    "ThreadMessagesResponse",
]
