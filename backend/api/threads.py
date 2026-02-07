"""
Thread API routes for Calm Sphere.

This module defines the REST API endpoints for thread management:
- POST /threads - Create a new thread
- GET /threads - List all threads for a user
- GET /threads/{thread_id} - Get messages in a thread
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from schemas.thread import (
    CreateThreadRequest,
    CreateThreadResponse,
    ListThreadsResponse,
    ThreadListItem,
    ThreadMessagesResponse,
)
from schemas.chat import Message
from core.storage import conversation_store


router = APIRouter(
    prefix="/threads",
    tags=["threads"]
)


@router.post("", response_model=CreateThreadResponse)
def create_thread(request: CreateThreadRequest) -> CreateThreadResponse:
    """Create a new empty conversation thread for a user.
    
    This endpoint initializes a new conversation thread that can
    contain multiple messages between the user and assistant.
    
    Args:
        request: The thread creation request containing user_id
        
    Returns:
        The created thread ID
    """
    thread_id = conversation_store.create_thread(request.user_id)
    return CreateThreadResponse(thread_id=thread_id)


@router.get("", response_model=ListThreadsResponse)
def list_threads(user_id: Optional[str] = None) -> ListThreadsResponse:
    """List all threads for a user.
    
    Args:
        user_id: The user ID to list threads for
        
    Returns:
        List of threads with metadata (most recent first)
        
    Raises:
        HTTPException: If user_id is not provided
    """
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id query parameter is required"
        )
    
    threads_data = conversation_store.get_user_threads(user_id)
    
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
        thread_item = ThreadListItem(
            thread_id=thread["thread_id"],
            created_at=thread["created_at"],
            last_updated=thread["last_updated"],
            preview=preview
        )
        thread_items.append(thread_item)
    
    return ListThreadsResponse(threads=thread_items)


@router.get("/{thread_id}", response_model=ThreadMessagesResponse)
def get_thread_messages(
    thread_id: str,
    user_id: Optional[str] = None
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
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="user_id query parameter is required"
        )
    
    thread = conversation_store.get_thread(user_id, thread_id)
    
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


__all__ = ["router"]
