"""
Chat-related Pydantic models for Calm Sphere.

This module defines the data models for chat messages and responses.
"""

from datetime import datetime
from typing import Dict, Optional
from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    """Enum for valid message roles."""
    USER = "user"
    ASSISTANT = "assistant"


class Message(BaseModel):
    """Represents a single message in a conversation thread.
    
    Attributes:
        role: The role of the message sender (user or assistant)
        content: The text content of the message
        timestamp: When the message was created (ISO 8601 format)
    """
    role: MessageRole = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message")
    timestamp: str = Field(description="ISO 8601 timestamp of when message was created")

    @classmethod
    def create_user(cls, content: str) -> "Message":
        """Factory method to create a user message with current timestamp."""
        return cls(
            role=MessageRole.USER,
            content=content,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

    @classmethod
    def create_assistant(cls, content: str) -> "Message":
        """Factory method to create an assistant message with current timestamp."""
        return cls(
            role=MessageRole.ASSISTANT,
            content=content,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )


class ChatRequest(BaseModel):
    """Request body for sending a chat message.
    
    Attributes:
        user_id: ID of the user sending the message
        thread_id: ID of the thread to add the message to
        message: The message content
    """
    user_id: Optional[str] = Field(default=None, description="ID of the user sending the message (deprecated when using auth)")
    thread_id: str = Field(description="ID of the thread to add the message to")
    message: str = Field(description="The message content to send")


class ChatResponse(BaseModel):
    """Response body for chat message.
    
    Attributes:
        reply: The assistant's reply message
    """
    reply: str = Field(description="The assistant's reply message")


class StartChatRequest(BaseModel):
    """Request body to start a new thread with the first message.

    This avoids a separate /threads call, improving latency for new chats.
    """

    user_id: Optional[str] = Field(default=None, description="ID of the user starting the chat (deprecated when using auth)")
    message: str = Field(description="The first message content to send")


class StartChatResponse(BaseModel):
    """Response body for starting a chat thread and receiving first reply."""

    thread_id: str = Field(description="ID of the newly created thread")
    reply: str = Field(description="The assistant's reply message")


class RegenerateRequest(BaseModel):
    """Request body for regenerating the latest assistant response in a thread.

    Attributes:
        user_id: ID of the user requesting regeneration
        thread_id: ID of the thread to regenerate the latest assistant message for
    """

    user_id: Optional[str] = Field(default=None, description="ID of the user requesting regeneration (deprecated when using auth)")
    thread_id: str = Field(description="ID of the thread")


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: Dict = Field(description="Error details with code, message, and optional details")


__all__ = [
    "MessageRole",
    "Message",
    "ChatRequest",
    "ChatResponse",
    "StartChatRequest",
    "StartChatResponse",
    "RegenerateRequest",
    "ErrorResponse",
]
