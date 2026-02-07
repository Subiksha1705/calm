"""
LLM Service for Calm Sphere.

This module provides the AI response generation layer.
Currently uses a mock implementation that can be swapped
with Hugging Face or other LLM providers.

The PRD specifies:
- Provider: Hugging Face Inference API
- Default Model: google/flan-t5-base
- Model configurable via environment variable
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class LLMService:
    """Service for generating AI responses.
    
    This is a mock implementation designed to be replaced
    with actual LLM integration (Hugging Face, OpenAI, etc.)
    
    Attributes:
        store: The conversation store for context
        
    Attributes:
        mock_mode: If True, uses fake responses (development)
        model_name: Name of the LLM model to use
        
    TODO: Implement actual Hugging Face integration:
        - Use Inference API to call the model
        - Build prompt with conversation context
        - Handle rate limits and errors
    """
    
    def __init__(
        self, 
        store: Any | None,
        mock_mode: bool = True,
        model_name: str = "google/flan-t5-base"
    ):
        """Initialize the LLM service.
        
        Args:
            store: The conversation store for accessing thread context
            mock_mode: If True, use fake responses (development only)
            model_name: Name of the LLM model to use
        """
        self._store = store
        self._mock_mode = mock_mode
        self._model_name = model_name

    def set_store(self, store: Any) -> None:
        self._store = store
    
    def generate_response(
        self, 
        user_id: str, 
        thread_id: str, 
        user_message: str
    ) -> str:
        """Generate a response to a user message.
        
        This method:
        1. Retrieves the conversation history for context
        2. Builds a prompt with system message and history
        3. Calls the LLM to generate a response
        4. Returns the response
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            user_message: The user's message
            
        Returns:
            The generated response text
        """
        if self._mock_mode:
            return self._generate_mock_response(user_message)
        
        return self._generate_llm_response(user_id, thread_id, user_message)
    
    def _generate_mock_response(self, user_message: str) -> str:
        """Generate a mock response for development.
        
        Args:
            user_message: The user's message
            
        Returns:
            Mock response string
        """
        return f"You said: {user_message}"
    
    def _generate_llm_response(
        self, 
        user_id: str, 
        thread_id: str, 
        user_message: str
    ) -> str:
        """Generate a real LLM response.
        
        TODO: Implement Hugging Face Inference API call.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            user_message: The user's message
            
        Returns:
            LLM response string
            
        Raises:
            NotImplementedError: Real LLM integration not yet implemented
        """
        if self._store is None:
            raise RuntimeError("LLMService store not configured")

        # Get conversation context
        thread = self._store.get_thread(user_id, thread_id)
        
        if thread:
            messages = thread.get("messages", [])[-10:]  # Last 10 messages
        else:
            messages = []
        
        # Build prompt
        prompt = self._build_prompt(messages, user_message)
        
        # TODO: Call Hugging Face Inference API
        # response = requests.post(
        #     f"https://api-inference.huggingface.co/models/{self._model_name}",
        #     headers={"Authorization": f"Bearer {HF_API_KEY}"},
        #     json={"inputs": prompt}
        # )
        
        raise NotImplementedError(
            "Real LLM integration not yet implemented. "
            "Set mock_mode=True for development."
        )
    
    def _build_prompt(
        self, 
        messages: List[Dict[str, Any]], 
        current_message: str
    ) -> str:
        """Build the prompt for the LLM.
        
        Args:
            messages: List of previous messages
            current_message: The current user message
            
        Returns:
            Formatted prompt string
        """
        prompt_parts = [
            "System: You are a calm, empathetic mental health assistant.",
            "Conversation:"
        ]
        
        for msg in messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        
        prompt_parts.append(f"User: {current_message}")
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)


# Global service instance
llm_service = LLMService(
    store=None,  # Will be set after store initialization
    mock_mode=True
)


__all__ = [
    "LLMService",
    "llm_service",
]
