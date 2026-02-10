"""
Chat API routes for Calm Sphere.

This module defines the REST API endpoints for chat functionality:
- POST /chat - Send a message and receive a response

Processing flow:
1. Validate thread ownership
2. Save user message
3. Generate assistant reply (mock or LLM)
4. Save assistant message
5. Return reply
"""

import json
import os
import time
from typing import Iterator, Optional, Union

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from schemas.chat import ChatResponse, RegenerateRequest, StartChatRequest, StartChatResponse
from core.storage import conversation_store
from core.llm import llm_service
from uuid import uuid4
from core.auth import AuthenticatedUser, get_optional_user


router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

STREAM_CHAR_DELAY_MS = float(os.getenv("STREAM_CHAR_DELAY_MS", "20"))


class UnifiedChatRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)
    thread_id: Optional[str] = Field(default=None)
    message: str


class LegacyThreadMessageRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)
    message: str


class LegacyRegenerateRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)


class StreamChatRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)
    thread_id: Optional[str] = Field(default=None)
    message: str


def _resolve_user_id(*, user: Optional[AuthenticatedUser], provided_user_id: Optional[str]) -> str:
    user_id = user.uid if user else provided_user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if user and provided_user_id and provided_user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")
    return user_id


def _save_assistant_reply(*, user_id: str, thread_id: str, message: str, reply: str) -> None:
    try:
        if hasattr(conversation_store, "add_exchange"):
            conversation_store.add_exchange(
                user_id=user_id,
                thread_id=thread_id,
                user_content=message,
                assistant_content=reply,
            )
        else:
            conversation_store.add_user_message(
                user_id=user_id,
                thread_id=thread_id,
                content=message,
            )
            conversation_store.add_assistant_message(
                user_id=user_id,
                thread_id=thread_id,
                content=reply,
            )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=f"Thread '{thread_id}' not found for user '{user_id}'",
        )


def _build_stream_payload(*, user_id: str, thread_id: Optional[str], message: str) -> tuple[str, str]:
    if thread_id:
        reply = llm_service.generate_response(
            user_id=user_id,
            thread_id=thread_id,
            user_message=message,
        )
        _save_assistant_reply(user_id=user_id, thread_id=thread_id, message=message, reply=reply)
        return thread_id, reply

    new_thread_id = str(uuid4())
    reply = llm_service.generate_response(
        user_id=user_id,
        thread_id=new_thread_id,
        user_message=message,
    )
    try:
        if hasattr(conversation_store, "start_thread_with_exchange"):
            conversation_store.start_thread_with_exchange(
                user_id=user_id,
                thread_id=new_thread_id,
                user_content=message,
                assistant_content=reply,
            )
        else:
            conversation_store.create_thread_with_id(user_id, new_thread_id)
            _save_assistant_reply(user_id=user_id, thread_id=new_thread_id, message=message, reply=reply)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to start chat thread")
    return new_thread_id, reply


def _sse_message(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _stream_reply(*, thread_id: str, reply: str, is_new_thread: bool) -> Iterator[str]:
    yield _sse_message({"type": "meta", "thread_id": thread_id, "is_new_thread": is_new_thread})
    delay_s = max(0.0, STREAM_CHAR_DELAY_MS / 1000.0)
    for ch in reply:
        yield _sse_message({"type": "delta", "delta": ch})
        if delay_s > 0:
            time.sleep(delay_s)
    yield _sse_message({"type": "done", "thread_id": thread_id})


def _start_chat_impl(*, user_id: str, message: str) -> StartChatResponse:
    thread_id = str(uuid4())
    reply = llm_service.generate_response(
        user_id=user_id,
        thread_id=thread_id,
        user_message=message,
    )

    try:
        if hasattr(conversation_store, "start_thread_with_exchange"):
            conversation_store.start_thread_with_exchange(
                user_id=user_id,
                thread_id=thread_id,
                user_content=message,
                assistant_content=reply,
            )
        else:
            created_thread_id = conversation_store.create_thread(user_id)
            thread_id = created_thread_id
            if hasattr(conversation_store, "add_exchange"):
                conversation_store.add_exchange(
                    user_id=user_id,
                    thread_id=thread_id,
                    user_content=message,
                    assistant_content=reply,
                )
            else:
                conversation_store.add_user_message(
                    user_id=user_id,
                    thread_id=thread_id,
                    content=message,
                )
                conversation_store.add_assistant_message(
                    user_id=user_id,
                    thread_id=thread_id,
                    content=reply,
                )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to start chat thread")

    return StartChatResponse(thread_id=thread_id, reply=reply)


def _send_message_impl(*, user_id: str, thread_id: str, message: str) -> ChatResponse:
    reply = llm_service.generate_response(
        user_id=user_id,
        thread_id=thread_id,
        user_message=message
    )

    try:
        if hasattr(conversation_store, "add_exchange"):
            conversation_store.add_exchange(
                user_id=user_id,
                thread_id=thread_id,
                user_content=message,
                assistant_content=reply,
            )
        else:
            conversation_store.add_user_message(
                user_id=user_id,
                thread_id=thread_id,
                content=message,
            )
            conversation_store.add_assistant_message(
                user_id=user_id,
                thread_id=thread_id,
                content=reply,
            )
    except Exception:
        # Treat missing thread as 404 (Firestore update() fails if doc missing).
        raise HTTPException(
            status_code=404,
            detail=f"Thread '{thread_id}' not found for user '{user_id}'",
        )

    return ChatResponse(reply=reply)


def _regenerate_impl(*, user_id: str, thread_id: str) -> ChatResponse:
    last_user_message = conversation_store.get_last_user_message(user_id, thread_id)
    if not last_user_message:
        raise HTTPException(status_code=400, detail="No user message found to regenerate from")

    reply = llm_service.generate_response(
        user_id=user_id,
        thread_id=thread_id,
        user_message=last_user_message,
    )

    replaced = conversation_store.replace_last_assistant_message(
        user_id=user_id,
        thread_id=thread_id,
        content=reply,
    )
    if not replaced:
        conversation_store.add_assistant_message(
            user_id=user_id,
            thread_id=thread_id,
            content=reply,
        )

    return ChatResponse(reply=reply)


@router.post("/start", response_model=StartChatResponse)
def start_chat(
    request: StartChatRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> StartChatResponse:
    """Create a thread, persist the first exchange, and return the reply.

    This avoids an extra round-trip to /threads for new chats.
    """
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    return _start_chat_impl(user_id=user_id, message=request.message)


@router.post("/stream")
def stream_chat(
    request: StreamChatRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> StreamingResponse:
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    resolved_thread_id, reply = _build_stream_payload(
        user_id=user_id,
        thread_id=request.thread_id,
        message=request.message,
    )
    is_new_thread = request.thread_id is None
    return StreamingResponse(
        _stream_reply(thread_id=resolved_thread_id, reply=reply, is_new_thread=is_new_thread),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("", response_model=Union[ChatResponse, StartChatResponse])
def chat(
    request: UnifiedChatRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> Union[ChatResponse, StartChatResponse]:
    """Send a message to a conversation thread and receive a response.
    
    This endpoint:
    1. Validates the thread exists and belongs to the user
    2. Saves the user's message to the thread
    3. Generates an appropriate response (mock or LLM)
    4. Saves the assistant's response to the thread
    5. Returns the response to the user
    
    Args:
        request: The chat request containing user_id, thread_id, and message
        
    Returns:
        The assistant's reply message
        
    Raises:
        HTTPException: If thread doesn't exist or other errors occur
    """
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    if request.thread_id:
        return _send_message_impl(user_id=user_id, thread_id=request.thread_id, message=request.message)
    return _start_chat_impl(user_id=user_id, message=request.message)


@router.post("/regenerate", response_model=ChatResponse)
def regenerate_last_response(
    request: RegenerateRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> ChatResponse:
    """Regenerate the latest assistant response in a thread.

    This endpoint:
    1. Validates the thread exists and belongs to the user
    2. Finds the most recent user message for context
    3. Generates a new assistant reply
    4. Replaces the last assistant message (if present), otherwise appends it
    """
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    return _regenerate_impl(user_id=user_id, thread_id=request.thread_id)


@router.post("/{thread_id}/regenerate", response_model=ChatResponse)
def regenerate_last_response_legacy(
    thread_id: str,
    request: LegacyRegenerateRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> ChatResponse:
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    return _regenerate_impl(user_id=user_id, thread_id=thread_id)


@router.post("/{thread_id}", response_model=ChatResponse)
def send_message_legacy(
    thread_id: str,
    request: LegacyThreadMessageRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> ChatResponse:
    user_id = _resolve_user_id(user=user, provided_user_id=request.user_id)
    return _send_message_impl(user_id=user_id, thread_id=thread_id, message=request.message)


__all__ = ["router"]
