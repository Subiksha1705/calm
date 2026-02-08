"""
In-memory conversation storage for Calm Sphere.

This module provides an in-memory implementation of conversation storage.
It is designed to be easily swapped with Firebase Firestore in production.

Storage Structure:
    {
        "user_id_1": {
            "thread_id_1": {
                "thread_id": "...",
                "created_at": "...",
                "last_updated": "...",
                "messages": [...]
            },
            "thread_id_2": {...}
        }
    }

This structure ensures:
- Messages never leak across threads
- Each user can have multiple threads
- O(1) access to any thread for a user
"""

from __future__ import annotations

from datetime import datetime
import os
from typing import Any, Dict, List, Optional
from uuid import uuid4


class InMemoryConversationStore:
    """In-memory storage for conversation threads.
    
    This class manages all conversation data in memory. It provides
    thread-safe operations for creating threads and adding messages.
    
    Attributes:
        _threads: Nested dictionary storing all thread data
        
    Note:
        Data is lost when the application restarts. This is acceptable
        for development but should be replaced with Firestore in production.
    """
    
    def __init__(self):
        # user_id -> {thread_id -> thread_data}
        self._threads: Dict[str, Dict[str, Dict[str, Any]]] = {}
    
    def create_thread(self, user_id: str) -> str:
        """Create a new empty thread for a user.
        
        Args:
            user_id: The user ID to create the thread for
            
        Returns:
            The newly created thread ID
        """
        thread_id = str(uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        
        thread_data = {
            "thread_id": thread_id,
            "created_at": now,
            "last_updated": now,
            "title": "",
            "messages": []
        }
        
        if user_id not in self._threads:
            self._threads[user_id] = {}
        
        self._threads[user_id][thread_id] = thread_data
        
        return thread_id

    def create_thread_with_id(self, user_id: str, thread_id: str) -> str:
        """Create a new empty thread using a provided thread_id."""
        now = datetime.utcnow().isoformat() + "Z"

        thread_data = {
            "thread_id": thread_id,
            "created_at": now,
            "last_updated": now,
            "title": "",
            "messages": [],
        }

        if user_id not in self._threads:
            self._threads[user_id] = {}

        self._threads[user_id][thread_id] = thread_data
        return thread_id
    
    def add_user_message(self, user_id: str, thread_id: str, content: str) -> Dict[str, Any]:
        """Add a user message to a thread.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID to add the message to
            content: The message content
            
        Returns:
            The created message data
            
        Raises:
            KeyError: If user or thread doesn't exist
        """
        if user_id not in self._threads:
            raise KeyError(f"User '{user_id}' not found")
        
        if thread_id not in self._threads[user_id]:
            raise KeyError(f"Thread '{thread_id}' not found for user '{user_id}'")
        
        now = datetime.utcnow().isoformat() + "Z"
        message = {
            "role": "user",
            "content": content,
            "timestamp": now
        }
        
        self._threads[user_id][thread_id]["messages"].append(message)
        self._threads[user_id][thread_id]["last_updated"] = now
        self._threads[user_id][thread_id]["last_user_message"] = content
        
        return message
    
    def add_assistant_message(
        self, 
        user_id: str, 
        thread_id: str, 
        content: str
    ) -> Dict[str, Any]:
        """Add an assistant message to a thread.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID to add the message to
            content: The message content
            
        Returns:
            The created message data
            
        Raises:
            KeyError: If user or thread doesn't exist
        """
        if user_id not in self._threads:
            raise KeyError(f"User '{user_id}' not found")
        
        if thread_id not in self._threads[user_id]:
            raise KeyError(f"Thread '{thread_id}' not found for user '{user_id}'")
        
        now = datetime.utcnow().isoformat() + "Z"
        message = {
            "role": "assistant",
            "content": content,
            "timestamp": now
        }
        
        self._threads[user_id][thread_id]["messages"].append(message)
        self._threads[user_id][thread_id]["last_updated"] = now
        
        return message

    def add_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        """Add a user message + assistant reply as a single operation."""
        user_msg = self.add_user_message(user_id, thread_id, user_content)
        assistant_msg = self.add_assistant_message(user_id, thread_id, assistant_content)
        return {"user": user_msg, "assistant": assistant_msg}

    def start_thread_with_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        """Create a new thread and add the first exchange."""
        self.create_thread_with_id(user_id, thread_id)
        exchange = self.add_exchange(
            user_id=user_id,
            thread_id=thread_id,
            user_content=user_content,
            assistant_content=assistant_content,
        )
        return {"thread_id": thread_id, **exchange}
    
    def get_thread(self, user_id: str, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get a thread by user and thread ID.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            
        Returns:
            The thread data if found, None otherwise
        """
        if user_id not in self._threads:
            return None
        
        return self._threads[user_id].get(thread_id)

    def thread_exists(self, user_id: str, thread_id: str) -> bool:
        """Check whether a thread exists for a user (fast path)."""
        if user_id not in self._threads:
            return False
        return thread_id in self._threads[user_id]
    
    def get_user_threads(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all threads for a user.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of thread data dictionaries
        """
        if user_id not in self._threads:
            return []
        
        return list(self._threads[user_id].values())

    def get_last_user_message(self, user_id: str, thread_id: str) -> Optional[str]:
        """Get the latest user message content in a thread."""
        thread = self.get_thread(user_id, thread_id)
        if not thread:
            return None
        for msg in reversed(thread.get("messages", [])):
            if msg.get("role") == "user":
                return msg.get("content", "")
        return None

    def replace_last_assistant_message(
        self, user_id: str, thread_id: str, content: str
    ) -> bool:
        """Replace the latest assistant message in a thread.

        Returns:
            True if a message was replaced, False if no assistant message existed.
        """
        if user_id not in self._threads:
            raise KeyError(f"User '{user_id}' not found")

        if thread_id not in self._threads[user_id]:
            raise KeyError(f"Thread '{thread_id}' not found for user '{user_id}'")

        messages = self._threads[user_id][thread_id]["messages"]
        for idx in range(len(messages) - 1, -1, -1):
            if messages[idx].get("role") == "assistant":
                now = datetime.utcnow().isoformat() + "Z"
                messages[idx]["content"] = content
                messages[idx]["timestamp"] = now
                self._threads[user_id][thread_id]["last_updated"] = now
                return True

        return False
    
    def delete_thread(self, user_id: str, thread_id: str) -> bool:
        """Delete a thread for a user.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID to delete
            
        Returns:
            True if thread was deleted, False if not found
        """
        if user_id not in self._threads:
            return False
        
        if thread_id not in self._threads[user_id]:
            return False
        
        del self._threads[user_id][thread_id]
        return True

    def rename_thread(self, user_id: str, thread_id: str, title: str) -> bool:
        """Rename a thread for a user."""
        if user_id not in self._threads:
            return False
        if thread_id not in self._threads[user_id]:
            return False
        now = datetime.utcnow().isoformat() + "Z"
        self._threads[user_id][thread_id]["title"] = title
        self._threads[user_id][thread_id]["last_updated"] = now
        return True


class ConversationStoreProxy:
    """Thin proxy that allows swapping the underlying store at runtime.

    API modules import `conversation_store` once at import time. Reassigning a module
    global later (e.g. during FastAPI startup) will not update those references.
    A proxy keeps the imported object stable while allowing the implementation to
    be swapped (in-memory vs Firestore).
    """

    def __init__(self, store: Any):
        self._store = store

    def set_store(self, store: Any) -> None:
        self._store = store

    def get_store(self) -> Any:
        return self._store

    def __getattr__(self, name: str) -> Any:
        return getattr(self._store, name)


# Global store instance (swappable via proxy)
conversation_store = ConversationStoreProxy(InMemoryConversationStore())


def init_conversation_store_from_env() -> str:
    """Initialize the global conversation store based on env vars.

    Returns:
        A short identifier of the selected backend ("firebase" or "memory").
    """
    use_firebase = os.getenv("USE_FIREBASE", "false").lower() == "true"
    if not use_firebase:
        conversation_store.set_store(InMemoryConversationStore())
        return "memory"

    # Import lazily so dev installs don't need firebase-admin.
    from core.firebase_storage import FirebaseConversationStore

    conversation_store.set_store(FirebaseConversationStore())
    return "firebase"


__all__ = [
    "InMemoryConversationStore",
    "conversation_store",
    "ConversationStoreProxy",
    "init_conversation_store_from_env",
]
