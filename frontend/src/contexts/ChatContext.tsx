'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { Message, Thread, ThreadListItem } from '@/types/chat';
import { ApiError, api } from '@/lib/api';


/**
 * ChatContext - API-backed thread state management
 *
 * Thread state is persisted in the backend (in-memory for now).
 * Frontend uses REST API to:
 * - create threads
 * - list threads
 * - load thread messages
 * - send messages / regenerate last response
 */

const USER_ID_STORAGE_KEY = 'calm_sphere_user_id';

function createRandomUserId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `user_${crypto.randomUUID()}`;
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getOrCreateUserId() {
  try {
    const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = createRandomUserId();
    localStorage.setItem(USER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    // localStorage may be unavailable (privacy mode, SSR)
    return createRandomUserId();
  }
}

interface ChatContextType {
  // Thread list items for sidebar display
  threadListItems: ThreadListItem[];
  // Active thread (null when no thread selected)
  activeThread: Thread | null;

  userId: string | null;
  isThreadsLoading: boolean;
  isThreadLoading: boolean;

  // Thread actions (API-backed)
  refreshThreads: () => Promise<void>;
  selectThread: (threadId: string) => Promise<boolean>;
  clearActiveThread: () => void;
  sendMessage: (content: string) => Promise<string>; // returns threadId
  regenerateLast: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);


/**
 * ChatProvider Component
 * 
 * Wraps the parallel routes to provide shared thread state.
 * 
 * @param children - Child components to wrap
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [threadListItems, setThreadListItems] = useState<ThreadListItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [activeThreadMeta, setActiveThreadMeta] = useState<Omit<Thread, 'messages'> | null>(null);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);

  // Initialize stable per-browser user id (no hardcoding)
  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!userId) return;
    setIsThreadsLoading(true);
    try {
      const res = await api.listThreads(userId);
      const items: ThreadListItem[] = res.threads.map((t) => ({
        id: t.thread_id,
        createdAt: t.created_at,
        updatedAt: t.last_updated,
        preview: t.preview,
      }));
      setThreadListItems(items);
    } finally {
      setIsThreadsLoading(false);
    }
  }, [userId]);

  // Load thread list once we have a user id
  useEffect(() => {
    if (!userId) return;
    void refreshThreads();
  }, [userId, refreshThreads]);

  const selectThread = useCallback(async (threadId: string) => {
    if (!userId) return false;

    // Avoid redundant network fetch when the thread is already active and loaded.
    if (threadId === activeThreadId) return true;

    setIsThreadLoading(true);
    setActiveThreadId(threadId);
    try {
      const res = await api.getThreadMessages(userId, threadId);
      setActiveMessages(
        res.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      );

      const metaFromList = threadListItems.find((t) => t.id === threadId) || null;
      setActiveThreadMeta(
        metaFromList
          ? { id: metaFromList.id, createdAt: metaFromList.createdAt, updatedAt: metaFromList.updatedAt }
          : { id: threadId, createdAt: '', updatedAt: '' }
      );
      return true;
    } catch (e: unknown) {
      // 404 -> thread not found
      if (e instanceof ApiError && e.status === 404) {
        setActiveThreadId(null);
        setActiveMessages([]);
        setActiveThreadMeta(null);
        return false;
      }
      throw e;
    } finally {
      setIsThreadLoading(false);
    }
  }, [userId, threadListItems, activeThreadId]);

  const clearActiveThread = useCallback(() => {
    setActiveThreadId(null);
    setActiveMessages([]);
    setActiveThreadMeta(null);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!userId) throw new Error('User not initialized');

    let threadId = activeThreadId;
    if (!threadId) {
      const started = await api.startChat(userId, content);
      threadId = started.thread_id;
      setActiveThreadId(threadId);
      setActiveThreadMeta({ id: threadId, createdAt: '', updatedAt: '' });

      const now = new Date().toISOString();
      setActiveMessages([
        { role: 'user', content, timestamp: now },
        { role: 'assistant', content: started.reply, timestamp: now },
      ]);
    } else {
      const now = new Date().toISOString();
      setActiveMessages((prev) => [...prev, { role: 'user', content, timestamp: now }]);

      const res = await api.sendMessage(userId, threadId, content);
      const assistantNow = new Date().toISOString();
      setActiveMessages((prev) => [...prev, { role: 'assistant', content: res.reply, timestamp: assistantNow }]);
    }

    void refreshThreads();
    return threadId;
  }, [userId, activeThreadId, refreshThreads]);

  const regenerateLast = useCallback(async () => {
    if (!userId || !activeThreadId) return;

    const res = await api.regenerate(userId, activeThreadId);
    const now = new Date().toISOString();

    setActiveMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i]?.role === 'assistant') {
          const next = [...prev];
          next[i] = { ...next[i], content: res.reply, timestamp: now };
          return next;
        }
      }
      return [...prev, { role: 'assistant', content: res.reply, timestamp: now }];
    });

    void refreshThreads();
  }, [userId, activeThreadId, refreshThreads]);

  const activeThread = useMemo<Thread | null>(() => {
    if (!activeThreadId) return null;
    const meta = activeThreadMeta || { id: activeThreadId, createdAt: '', updatedAt: '' };
    return { ...meta, messages: activeMessages };
  }, [activeThreadId, activeThreadMeta, activeMessages]);

  return (
    <ChatContext.Provider 
      value={{ 
        threadListItems,
        activeThread,
        userId,
        isThreadsLoading,
        isThreadLoading,
        refreshThreads,
        selectThread,
        clearActiveThread,
        sendMessage,
        regenerateLast,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}


/**
 * useChat Hook
 * 
 * Access chat context state.
 * Must be used within a ChatProvider.
 */
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
