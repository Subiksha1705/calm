"""
Redis cache wrapper for conversation storage.

This wrapper keeps Firestore (or any base store) as source of truth and uses
Redis for read caching on:
- user thread list (sidebar)
- thread message payload (thread view)
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


class RedisCachedConversationStore:
    """Cache decorator for conversation store implementations."""

    def __init__(
        self,
        *,
        base_store: Any,
        redis_client: Any,
        thread_ttl_seconds: int = 0,
        threads_ttl_seconds: int = 0,
        key_prefix: str = "calm_sphere",
    ) -> None:
        self._base = base_store
        self._redis = redis_client
        # 0 means "no expiry": keep cached until explicit invalidation.
        self._thread_ttl_s = max(0, int(thread_ttl_seconds))
        self._threads_ttl_s = max(0, int(threads_ttl_seconds))
        self._key_prefix = key_prefix.strip() or "calm_sphere"

    def _user_threads_key(self, user_id: str) -> str:
        return f"{self._key_prefix}:threads:{user_id}"

    def _thread_key(self, user_id: str, thread_id: str) -> str:
        return f"{self._key_prefix}:thread:{user_id}:{thread_id}"

    def _delete_key(self, key: str) -> None:
        try:
            self._redis.delete(key)
        except Exception:
            # Cache should never break primary request path.
            pass

    def _set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        try:
            payload = json.dumps(value)
            if ttl_seconds <= 0:
                self._redis.set(key, payload)
            else:
                self._redis.setex(key, ttl_seconds, payload)
        except Exception:
            pass

    def _get_json(self, key: str) -> Optional[Any]:
        try:
            raw = self._redis.get(key)
        except Exception:
            return None
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    def _invalidate_user(self, user_id: str) -> None:
        self._delete_key(self._user_threads_key(user_id))

    def _invalidate_thread(self, user_id: str, thread_id: str) -> None:
        self._delete_key(self._thread_key(user_id, thread_id))
        self._delete_key(self._user_threads_key(user_id))

    def create_thread(self, user_id: str) -> str:
        thread_id = self._base.create_thread(user_id)
        self._invalidate_thread(user_id, thread_id)
        return thread_id

    def create_thread_with_id(self, user_id: str, thread_id: str) -> str:
        created = self._base.create_thread_with_id(user_id, thread_id)
        self._invalidate_thread(user_id, thread_id)
        return created

    def start_thread_with_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        out = self._base.start_thread_with_exchange(
            user_id=user_id,
            thread_id=thread_id,
            user_content=user_content,
            assistant_content=assistant_content,
        )
        self._invalidate_thread(user_id, thread_id)
        return out

    def add_user_message(self, user_id: str, thread_id: str, content: str) -> Dict[str, Any]:
        msg = self._base.add_user_message(user_id, thread_id, content)
        self._invalidate_thread(user_id, thread_id)
        return msg

    def add_assistant_message(self, user_id: str, thread_id: str, content: str) -> Dict[str, Any]:
        msg = self._base.add_assistant_message(user_id, thread_id, content)
        self._invalidate_thread(user_id, thread_id)
        return msg

    def add_exchange(
        self,
        user_id: str,
        thread_id: str,
        user_content: str,
        assistant_content: str,
    ) -> Dict[str, Any]:
        out = self._base.add_exchange(
            user_id=user_id,
            thread_id=thread_id,
            user_content=user_content,
            assistant_content=assistant_content,
        )
        self._invalidate_thread(user_id, thread_id)
        return out

    def get_thread(self, user_id: str, thread_id: str) -> Optional[Dict[str, Any]]:
        key = self._thread_key(user_id, thread_id)
        cached = self._get_json(key)
        if isinstance(cached, dict):
            return cached

        thread = self._base.get_thread(user_id, thread_id)
        if thread is not None:
            self._set_json(key, thread, self._thread_ttl_s)
        return thread

    def thread_exists(self, user_id: str, thread_id: str) -> bool:
        key = self._thread_key(user_id, thread_id)
        cached = self._get_json(key)
        if isinstance(cached, dict):
            return True
        return bool(self._base.thread_exists(user_id, thread_id))

    def get_user_threads(self, user_id: str) -> List[Dict[str, Any]]:
        key = self._user_threads_key(user_id)
        cached = self._get_json(key)
        if isinstance(cached, list):
            return cached

        threads = self._base.get_user_threads(user_id)
        self._set_json(key, threads, self._threads_ttl_s)
        return threads

    def get_last_user_message(self, user_id: str, thread_id: str) -> Optional[str]:
        thread = self.get_thread(user_id, thread_id)
        if not thread:
            return None
        for msg in reversed(thread.get("messages", [])):
            if msg.get("role") == "user":
                return str(msg.get("content") or "")
        return None

    def replace_last_assistant_message(self, user_id: str, thread_id: str, content: str) -> bool:
        replaced = bool(self._base.replace_last_assistant_message(user_id, thread_id, content))
        self._invalidate_thread(user_id, thread_id)
        return replaced

    def delete_thread(self, user_id: str, thread_id: str) -> bool:
        ok = bool(self._base.delete_thread(user_id, thread_id))
        self._invalidate_thread(user_id, thread_id)
        return ok

    def rename_thread(self, user_id: str, thread_id: str, title: str) -> bool:
        ok = bool(self._base.rename_thread(user_id, thread_id, title))
        self._invalidate_thread(user_id, thread_id)
        return ok

    def warm_user_cache(self, user_id: str) -> int:
        """Warm list cache for a user and return thread count."""
        threads = self.get_user_threads(user_id)
        return len(threads)
