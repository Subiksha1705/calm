"""
Firebase Firestore storage for Calm Sphere.

This module provides a Firebase Firestore implementation of conversation storage.
It replaces the in-memory storage for production use.

Data Structure in Firestore:
    Collection: users
    └── Document: {user_id}
        └── Subcollection: threads
            └── Document: {thread_id}
                ├── thread_id: string
                ├── user_id: string
                ├── created_at: timestamp
                ├── last_updated: timestamp
                ├── preview: string
                ├── last_user_message: string
                ├── last_assistant_message_id: string | null
                └── Subcollection: messages
                    └── Document: {message_id}
                        ├── role: "user" | "assistant"
                        ├── content: string
                        └── timestamp: timestamp
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

import firebase_admin
from firebase_admin import firestore

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from core.firebase_app import ensure_firebase_admin_initialized


class FirebaseConversationStore:
    """Firebase Firestore implementation of conversation storage."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, credentials_path: str = None):
        """Singleton pattern to reuse Firebase connection."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, credentials_path: str = None):
        """Initialize Firebase connection."""
        if FirebaseConversationStore._initialized:
            return

        if not firebase_admin._apps:
            logger.info("🚀 Initializing Firebase app from FIREBASE_CREDENTIALS_JSON env var...")
            ensure_firebase_admin_initialized()
            logger.info("✅ Firebase app initialized")
        else:
            logger.info("♻️ Firebase app already initialized")
        
        self._db = firestore.client()
        logger.info("✅ Firestore client created")
        FirebaseConversationStore._initialized = True

    def _threads_ref(self, user_id: str):
        return self._db.collection("users").document(user_id).collection("threads")

    def _thread_ref(self, user_id: str, thread_id: str):
        return self._threads_ref(user_id).document(thread_id)

    def _messages_ref(self, user_id: str, thread_id: str):
        return self._thread_ref(user_id, thread_id).collection("messages")

    def _to_iso(self, value: Any, fallback_dt: Optional[datetime] = None) -> str:
        dt: Optional[datetime]
        if isinstance(value, datetime):
            dt = value
        else:
            dt = fallback_dt
        if dt is None:
            return ""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    
    def create_thread(self, user_id: str) -> str:
        """Create a new empty thread for a user.
        
        Args:
            user_id: The user ID to create the thread for
            
        Returns:
            The newly created thread ID
        """
        logger.info(f"📝 create_thread() called - user_id: {user_id}")
        
        thread_id = str(uuid4())
        
        thread_data = {
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "last_updated": firestore.SERVER_TIMESTAMP,
            "title": "",
            "preview": "",
            "last_user_message": "",
            "last_assistant_message_id": None,
        }
        
        logger.info(f"📤 Creating thread in Firestore (users/{user_id}/threads): {thread_id}")
        self._thread_ref(user_id, thread_id).set(thread_data)
        
        logger.info(f"✅ Thread created successfully: {thread_id}")
        return thread_id

    def start_thread_with_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        """Create a thread and persist the first exchange with one batch commit."""
        user_message_id = str(uuid4())
        assistant_message_id = str(uuid4())

        thread_ref = self._thread_ref(user_id, thread_id)
        user_ref = self._messages_ref(user_id, thread_id).document(user_message_id)
        assistant_ref = self._messages_ref(user_id, thread_id).document(assistant_message_id)

        preview = assistant_content[:50] + ("..." if len(assistant_content) > 50 else "")

        batch = self._db.batch()
        batch.set(
            thread_ref,
            {
                "thread_id": thread_id,
                "user_id": user_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "title": "",
                "preview": preview,
                "last_user_message": user_content,
                "last_assistant_message_id": assistant_message_id,
            },
        )
        batch.set(
            user_ref,
            {"role": "user", "content": user_content, "timestamp": firestore.SERVER_TIMESTAMP},
        )
        batch.set(
            assistant_ref,
            {"role": "assistant", "content": assistant_content, "timestamp": firestore.SERVER_TIMESTAMP},
        )
        batch.commit()

        now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        return {
            "thread_id": thread_id,
            "user": {"role": "user", "content": user_content, "timestamp": now_iso},
            "assistant": {"role": "assistant", "content": assistant_content, "timestamp": now_iso},
        }
    
    def add_user_message(self, user_id: str, thread_id: str, content: str) -> Dict[str, Any]:
        """Add a user message to a thread.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID to add the message to
            content: The message content
            
        Returns:
            The created message data
        """
        logger.info(f"📝 add_user_message() called - user_id: {user_id}, thread_id: {thread_id}")
        return self._add_message(user_id, thread_id, content, "user")
    
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
        """
        logger.info(f"📝 add_assistant_message() called - user_id: {user_id}, thread_id: {thread_id}")
        return self._add_message(user_id, thread_id, content, "assistant")

    def add_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        """Persist a user+assistant exchange with a single batch commit."""
        user_message_id = str(uuid4())
        assistant_message_id = str(uuid4())

        user_ref = self._messages_ref(user_id, thread_id).document(user_message_id)
        assistant_ref = self._messages_ref(user_id, thread_id).document(assistant_message_id)
        thread_ref = self._thread_ref(user_id, thread_id)

        preview = assistant_content[:50] + ("..." if len(assistant_content) > 50 else "")

        batch = self._db.batch()
        batch.set(
            user_ref,
            {"role": "user", "content": user_content, "timestamp": firestore.SERVER_TIMESTAMP},
        )
        batch.set(
            assistant_ref,
            {"role": "assistant", "content": assistant_content, "timestamp": firestore.SERVER_TIMESTAMP},
        )
        batch.update(
            thread_ref,
            {
                "last_updated": firestore.SERVER_TIMESTAMP,
                "preview": preview,
                "last_user_message": user_content,
                "last_assistant_message_id": assistant_message_id,
            },
        )
        batch.commit()

        now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        return {
            "user": {"role": "user", "content": user_content, "timestamp": now_iso},
            "assistant": {"role": "assistant", "content": assistant_content, "timestamp": now_iso},
        }
    
    def _add_message(
        self, 
        user_id: str, 
        thread_id: str, 
        content: str, 
        role: str
    ) -> Dict[str, Any]:
        """Internal method to add a message."""
        logger.info(f"📝 _add_message() - user_id: {user_id}, thread_id: {thread_id}, role: {role}")

        message_id = str(uuid4())
        message_ref = self._messages_ref(user_id, thread_id).document(message_id)
        thread_ref = self._thread_ref(user_id, thread_id)

        # Use a batch for low-latency, atomic updates (2 writes, no reads).
        batch = self._db.batch()
        batch.set(
            message_ref,
            {
                "role": role,
                "content": content,
                "timestamp": firestore.SERVER_TIMESTAMP,
            },
        )

        preview = content[:50] + ("..." if len(content) > 50 else "")
        thread_updates: Dict[str, Any] = {
            "last_updated": firestore.SERVER_TIMESTAMP,
            "preview": preview,
        }
        if role == "user":
            thread_updates["last_user_message"] = content
        elif role == "assistant":
            thread_updates["last_assistant_message_id"] = message_id

        # update() fails if the thread doesn't exist -> correct behavior
        batch.update(thread_ref, thread_updates)
        batch.commit()

        # We don't round-trip to fetch server timestamps; return best-effort ISO now.
        now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        return {"role": role, "content": content, "timestamp": now_iso}
    
    def get_thread(self, user_id: str, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get a thread by user and thread ID.
        
        Args:
            user_id: The user ID
            thread_id: The thread ID
            
        Returns:
            The thread data if found, None otherwise
        """
        logger.info(f"📝 get_thread() called - user_id: {user_id}, thread_id: {thread_id}")

        thread_doc = self._thread_ref(user_id, thread_id).get()
        if not thread_doc.exists:
            logger.warning(f"⚠️ Thread not found: {thread_id}")
            return None

        thread_data = thread_doc.to_dict() or {}
        created_at = self._to_iso(thread_data.get("created_at"), fallback_dt=getattr(thread_doc, "create_time", None))
        last_updated = self._to_iso(thread_data.get("last_updated"), fallback_dt=getattr(thread_doc, "update_time", None))

        messages: List[Dict[str, Any]] = []
        for msg_doc in self._messages_ref(user_id, thread_id).order_by("timestamp").stream():
            msg = msg_doc.to_dict() or {}
            ts = self._to_iso(msg.get("timestamp"), fallback_dt=getattr(msg_doc, "create_time", None))
            messages.append(
                {
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                    "timestamp": ts,
                }
            )

        return {
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": created_at,
            "last_updated": last_updated,
            "messages": messages,
            "preview": thread_data.get("preview", ""),
        }

    def thread_exists(self, user_id: str, thread_id: str) -> bool:
        """Check whether a thread exists for a user (fast path)."""
        return self._thread_ref(user_id, thread_id).get().exists
    
    def get_user_threads(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all threads for a user.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of thread data dictionaries
        """
        logger.info(f"📝 get_user_threads() called - user_id: {user_id}")

        threads: List[Dict[str, Any]] = []
        for doc in self._threads_ref(user_id).order_by(
            "last_updated", direction=firestore.Query.DESCENDING
        ).stream():
            data = doc.to_dict() or {}
            created_at = self._to_iso(data.get("created_at"), fallback_dt=getattr(doc, "create_time", None))
            last_updated = self._to_iso(data.get("last_updated"), fallback_dt=getattr(doc, "update_time", None))
            threads.append(
                {
                    "thread_id": data.get("thread_id", doc.id),
                    "user_id": user_id,
                    "created_at": created_at,
                    "last_updated": last_updated,
                    "messages": [],
                    "title": data.get("title", ""),
                    "preview": data.get("preview", ""),
                    "last_user_message": data.get("last_user_message", ""),
                }
            )

        logger.info(f"✅ Retrieved {len(threads)} threads for user {user_id}")
        return threads
    
    def get_last_user_message(self, user_id: str, thread_id: str) -> Optional[str]:
        """Get the latest user message content in a thread."""
        thread_doc = self._thread_ref(user_id, thread_id).get()
        if not thread_doc.exists:
            return None
        data = thread_doc.to_dict() or {}
        content = data.get("last_user_message", "")
        return content or None
    
    def replace_last_assistant_message(
        self, 
        user_id: str, 
        thread_id: str, 
        content: str
    ) -> bool:
        """Replace the latest assistant message in a thread."""
        thread_ref = self._thread_ref(user_id, thread_id)
        thread_doc = thread_ref.get()
        if not thread_doc.exists:
            return False

        data = thread_doc.to_dict() or {}
        message_id = data.get("last_assistant_message_id")
        if not message_id:
            return False

        message_ref = self._messages_ref(user_id, thread_id).document(str(message_id))

        preview = content[:50] + ("..." if len(content) > 50 else "")
        batch = self._db.batch()
        try:
            batch.update(
                message_ref,
                {
                    "content": content,
                    "timestamp": firestore.SERVER_TIMESTAMP,
                },
            )
            batch.update(
                thread_ref,
                {
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "preview": preview,
                },
            )
            batch.commit()
            return True
        except Exception:
            return False
    
    def delete_thread(self, user_id: str, thread_id: str) -> bool:
        """Delete a thread for a user."""
        thread_ref = self._thread_ref(user_id, thread_id)
        thread_doc = thread_ref.get()
        if not thread_doc.exists:
            return False

        # Delete messages first (subcollections are not deleted automatically).
        batch = self._db.batch()
        op_count = 0
        for msg_doc in self._messages_ref(user_id, thread_id).stream():
            batch.delete(msg_doc.reference)
            op_count += 1
            if op_count >= 400:
                batch.commit()
                batch = self._db.batch()
                op_count = 0
        if op_count:
            batch.commit()

        thread_ref.delete()
        return True

    def rename_thread(self, user_id: str, thread_id: str, title: str) -> bool:
        thread_ref = self._thread_ref(user_id, thread_id)
        if not thread_ref.get().exists:
            return False
        thread_ref.update({"title": title, "last_updated": firestore.SERVER_TIMESTAMP})
        return True


# Factory function to get Firebase store instance
def get_firebase_store() -> FirebaseConversationStore:
    """Get a Firebase conversation store instance."""
    return FirebaseConversationStore()


# Global store instance
_firebase_store = None


def get_conversation_store() -> FirebaseConversationStore:
    """Get the global conversation store instance (Firebase)."""
    global _firebase_store
    if _firebase_store is None:
        _firebase_store = FirebaseConversationStore()
    return _firebase_store


__all__ = [
    "FirebaseConversationStore",
    "get_firebase_store",
    "get_conversation_store",
]
