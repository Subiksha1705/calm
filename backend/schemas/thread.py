"""
Thread-related Pydantic models for Calm Sphere.

This module defines the data models for conversation threads.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class CreateThreadRequest(BaseModel):
    """Request body for creating a new thread."""
    user_id: str = Field(description="ID of the user creating the thread")


class CreateThreadResponse(BaseModel):
    """Response body for thread creation."""
    thread_id: str = Field(description="ID of the newly created thread")


class ThreadResponse(BaseModel):
    """Response for thread details including metadata."""
    thread_id: str = Field(description="Unique thread identifier")
    created_at: str = Field(description="ISO 8601 timestamp when thread was created")
    last_updated: str = Field(description="ISO 8601 timestamp of last activity")
    preview: str = Field(description="Preview of the last message")


class ListThreadsResponse(BaseModel):
    """Response for listing all threads for a user."""
    threads: List["ThreadListItem"] = Field(description="List of user's threads")


class ThreadListItem(BaseModel):
    """Thread item for list responses (includes metadata)."""
    thread_id: str = Field(description="Unique thread identifier")
    created_at: str = Field(description="ISO 8601 timestamp when thread was created")
    last_updated: str = Field(description="ISO 8601 timestamp of last activity")
    preview: str = Field(description="Preview of the last message")

    @classmethod
    def from_thread_data(
        cls, 
        thread_id: str, 
        created_at: str, 
        last_updated: str, 
        preview: str
    ) -> "ThreadListItem":
        """Create a ThreadListItem from thread data."""
        return cls(
            thread_id=thread_id,
            created_at=created_at,
            last_updated=last_updated,
            preview=preview
        )


class ThreadMessagesResponse(BaseModel):
    """Response for getting all messages in a thread."""
    messages: List["Message"] = Field(description="Ordered list of messages in thread")


# Import Message for type hints (avoid circular import at runtime)
if TYPE_CHECKING:
    from schemas.chat import Message

__all__ = [
    "CreateThreadRequest",
    "CreateThreadResponse",
    "ThreadResponse",
    "ListThreadsResponse",
    "ThreadListItem",
    "ThreadMessagesResponse",
]
