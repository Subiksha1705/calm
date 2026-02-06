"""
Core business logic package for Calm Sphere.

This package contains core business logic components:
- storage.py: Conversation storage (in-memory, swappable with Firestore)
- llm.py: LLM service (mock, swappable with Hugging Face)
"""

from core.storage import InMemoryConversationStore, conversation_store
from core.llm import LLMService, llm_service

__all__ = [
    "InMemoryConversationStore",
    "conversation_store",
    "LLMService",
    "llm_service",
]
