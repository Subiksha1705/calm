"""
Thread API routes for Calm Sphere.

This module defines the REST API endpoints for thread management:
- POST /threads - Create a new thread
- GET /threads - List all threads for a user
- GET /threads/{thread_id} - Get messages in a thread
"""

from typing import List, Optional
import re

from fastapi import APIRouter, Depends, HTTPException

from schemas.thread import (
    CreateThreadRequest,
    CreateThreadResponse,
    ListThreadsResponse,
    ThreadListItem,
    ThreadMessagesResponse,
    RenameThreadRequest,
    MutateThreadResponse,
)
from schemas.chat import Message
from core.storage import conversation_store
from core.auth import AuthenticatedUser, get_optional_user


router = APIRouter(
    prefix="/threads",
    tags=["threads"]
)

_TITLE_WORD_RE = re.compile(r"[^\w\s]", re.UNICODE)


def _derive_title(text: str) -> str:
    cleaned = _TITLE_WORD_RE.sub("", (text or "").replace("\n", " ")).strip()
    if not cleaned:
        return "New chat"
    words = cleaned.split()
    return " ".join(words[:3])


@router.post("", response_model=CreateThreadResponse)
def create_thread(
    request: CreateThreadRequest,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> CreateThreadResponse:
    """Create a new empty conversation thread for a user.
    
    This endpoint initializes a new conversation thread that can
    contain multiple messages between the user and assistant.
    
    Args:
        request: The thread creation request containing user_id
        
    Returns:
        The created thread ID
    """
    user_id = user.uid if user else request.user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if user and request.user_id and request.user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

    thread_id = conversation_store.create_thread(user_id)
    return CreateThreadResponse(thread_id=thread_id)


@router.get("", response_model=ListThreadsResponse)
def list_threads(
    user_id: Optional[str] = None,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> ListThreadsResponse:
    """List all threads for a user.
    
    Args:
        user_id: The user ID to list threads for
        
    Returns:
        List of threads with metadata (most recent first)
        
    Raises:
        HTTPException: If user_id is not provided
    """
    effective_user_id = user.uid if user else user_id
    if not effective_user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id query parameter is required"
        )
    if user and user_id and user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")
    
    threads_data = conversation_store.get_user_threads(effective_user_id)
    
    # Sort by last_updated descending (most recent first)
    threads_data.sort(
        key=lambda t: t.get("last_updated", ""), 
        reverse=True
    )
    
    thread_items = []
    for thread in threads_data:
        preview = thread.get("preview", "")
        if not preview and thread.get("messages"):
            preview = thread["messages"][-1]["content"][:50] + "..."
        title = thread.get("title") or _derive_title(thread.get("last_user_message") or preview)
        thread_item = ThreadListItem(
            thread_id=thread["thread_id"],
            created_at=thread["created_at"],
            last_updated=thread["last_updated"],
            title=title,
            preview=preview
        )
        thread_items.append(thread_item)
    
    return ListThreadsResponse(threads=thread_items)


@router.get("/{thread_id}", response_model=ThreadMessagesResponse)
def get_thread_messages(
    thread_id: str,
    user_id: Optional[str] = None,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> ThreadMessagesResponse:
    """Get all messages in a thread.
    
    Args:
        thread_id: The thread ID to get messages from
        user_id: The user ID (required for authorization)
        
    Returns:
        List of all messages in the thread
        
    Raises:
        HTTPException: If user_id is not provided or thread not found
    """
    effective_user_id = user.uid if user else user_id
    if not effective_user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id query parameter is required"
        )
    if user and user_id and user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")
    
    thread = conversation_store.get_thread(effective_user_id, thread_id)
    
    if not thread:
        raise HTTPException(
            status_code=404,
            detail=f"Thread '{thread_id}' not found"
        )
    
    messages = [
        Message(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg["timestamp"]
        )
        for msg in thread["messages"]
    ]
    
    return ThreadMessagesResponse(messages=messages)


@router.patch("/{thread_id}", response_model=MutateThreadResponse)
def rename_thread(
    thread_id: str,
    request: RenameThreadRequest,
    user_id: Optional[str] = None,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> MutateThreadResponse:
    effective_user_id = user.uid if user else user_id
    if not effective_user_id:
        raise HTTPException(status_code=400, detail="user_id query parameter is required")
    if user and user_id and user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

    title = (request.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    if not hasattr(conversation_store, "rename_thread"):
        raise HTTPException(status_code=501, detail="Rename not supported by store")

    ok = bool(conversation_store.rename_thread(effective_user_id, thread_id, title))
    if not ok:
        raise HTTPException(status_code=404, detail=f"Thread '{thread_id}' not found")
    return MutateThreadResponse(ok=True)


@router.delete("/{thread_id}", response_model=MutateThreadResponse)
def delete_thread(
    thread_id: str,
    user_id: Optional[str] = None,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
) -> MutateThreadResponse:
    effective_user_id = user.uid if user else user_id
    if not effective_user_id:
        raise HTTPException(status_code=400, detail="user_id query parameter is required")
    if user and user_id and user_id != user.uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

    ok = bool(conversation_store.delete_thread(effective_user_id, thread_id))
    if not ok:
        raise HTTPException(status_code=404, detail=f"Thread '{thread_id}' not found")
    return MutateThreadResponse(ok=True)


__all__ = ["router"]
