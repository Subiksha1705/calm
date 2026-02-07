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

from fastapi import APIRouter, HTTPException

from schemas.chat import ChatRequest, ChatResponse, RegenerateRequest
from core.storage import conversation_store
from core.llm import llm_service


router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)


@router.post("", response_model=ChatResponse)
def send_message(request: ChatRequest) -> ChatResponse:
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
    # Validate thread exists
    thread = conversation_store.get_thread(request.user_id, request.thread_id)
    
    if not thread:
        raise HTTPException(
            status_code=404,
            detail=f"Thread '{request.thread_id}' not found for user '{request.user_id}'"
        )
    
    # Save user message
    conversation_store.add_user_message(
        user_id=request.user_id,
        thread_id=request.thread_id,
        content=request.message
    )
    
    # Generate response
    reply = llm_service.generate_response(
        user_id=request.user_id,
        thread_id=request.thread_id,
        user_message=request.message
    )
    
    # Save assistant message
    conversation_store.add_assistant_message(
        user_id=request.user_id,
        thread_id=request.thread_id,
        content=reply
    )
    
    return ChatResponse(reply=reply)


@router.post("/regenerate", response_model=ChatResponse)
def regenerate_last_response(request: RegenerateRequest) -> ChatResponse:
    """Regenerate the latest assistant response in a thread.

    This endpoint:
    1. Validates the thread exists and belongs to the user
    2. Finds the most recent user message for context
    3. Generates a new assistant reply
    4. Replaces the last assistant message (if present), otherwise appends it
    """
    thread = conversation_store.get_thread(request.user_id, request.thread_id)
    if not thread:
        raise HTTPException(
            status_code=404,
            detail=f"Thread '{request.thread_id}' not found for user '{request.user_id}'",
        )

    last_user_message = conversation_store.get_last_user_message(request.user_id, request.thread_id)
    if not last_user_message:
        raise HTTPException(status_code=400, detail="No user message found to regenerate from")

    reply = llm_service.generate_response(
        user_id=request.user_id,
        thread_id=request.thread_id,
        user_message=last_user_message,
    )

    replaced = conversation_store.replace_last_assistant_message(
        user_id=request.user_id,
        thread_id=request.thread_id,
        content=reply,
    )
    if not replaced:
        conversation_store.add_assistant_message(
            user_id=request.user_id,
            thread_id=request.thread_id,
            content=reply,
        )

    return ChatResponse(reply=reply)


__all__ = ["router"]
