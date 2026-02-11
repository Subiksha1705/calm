'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Message, Thread, ThreadListItem } from '@/types/chat';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';


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

interface ChatContextType {
  // Thread list items for sidebar display
  threadListItems: ThreadListItem[];
  // Active thread (null when no thread selected)
  activeThread: Thread | null;
  isTemporaryChat: boolean;

  userId: string | null;
  isThreadsLoading: boolean;
  isThreadLoading: boolean;

  // Thread actions (API-backed)
  refreshThreads: () => Promise<void>;
  selectThread: (threadId: string) => Promise<boolean>;
  startTemporaryChat: () => void;
  closeTemporaryChat: () => void;
  clearActiveThread: () => void;
  sendMessage: (content: string) => Promise<string | null>; // returns threadId for persisted chats
  regenerateLast: () => Promise<void>;

  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);
const THREAD_REVALIDATE_MS = 30_000;


/**
 * ChatProvider Component
 * 
 * Wraps the parallel routes to provide shared thread state.
 * 
 * @param children - Child components to wrap
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [threadListItems, setThreadListItems] = useState<ThreadListItem[]>([]);
  const [threadMessageCache, setThreadMessageCache] = useState<Record<string, Message[]>>({});
  const [threadFetchedAt, setThreadFetchedAt] = useState<Record<string, number>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [activeThreadMeta, setActiveThreadMeta] = useState<Omit<Thread, 'messages'> | null>(null);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [temporaryMessages, setTemporaryMessages] = useState<Message[]>([]);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const activeThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    setUserId(user?.uid || null);
    if (!user?.uid) {
      setThreadMessageCache({});
      setThreadFetchedAt({});
      setActiveThreadId(null);
      setActiveMessages([]);
      setActiveThreadMeta(null);
      setIsTemporaryChat(false);
      setTemporaryMessages([]);
      setThreadListItems([]);
      setIsThreadLoading(false);
      setIsThreadsLoading(false);
    }
  }, [user?.uid]);

  const refreshThreads = useCallback(async () => {
    if (!userId) return;
    setIsThreadsLoading(true);
    try {
      const res = await api.listThreads(userId);
      const items: ThreadListItem[] = res.threads.map((t) => ({
        id: t.thread_id,
        createdAt: t.created_at,
        updatedAt: t.last_updated,
        title: t.title,
        preview: t.preview,
      }));
      setThreadListItems(items);
    } finally {
      setIsThreadsLoading(false);
    }
  }, [userId]);

  const fetchThreadMessages = useCallback(
    async (threadId: string): Promise<boolean> => {
      if (!userId) return false;
      try {
        const res = await api.getThreadMessages(threadId, userId);
        const messages: Message[] = res.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        const fetchedAt = Date.now();
        setThreadMessageCache((prev) => ({ ...prev, [threadId]: messages }));
        setThreadFetchedAt((prev) => ({ ...prev, [threadId]: fetchedAt }));
        setActiveMessages((prev) => (activeThreadIdRef.current === threadId ? messages : prev));
        return true;
      } catch (e: unknown) {
        if (e instanceof ApiError && e.statusCode === 404) {
          setThreadMessageCache((prev) => {
            if (!(threadId in prev)) return prev;
            const next = { ...prev };
            delete next[threadId];
            return next;
          });
          setThreadFetchedAt((prev) => {
            if (!(threadId in prev)) return prev;
            const next = { ...prev };
            delete next[threadId];
            return next;
          });
          if (activeThreadIdRef.current === threadId) {
            setActiveThreadId(null);
            setActiveMessages([]);
            setActiveThreadMeta(null);
          }
          return false;
        }
        throw e;
      }
    },
    [userId]
  );

  // Load thread list once we have a user id
  useEffect(() => {
    if (!userId) return;
    void refreshThreads();
  }, [userId, refreshThreads]);

  const selectThread = useCallback(async (threadId: string) => {
    if (!userId) return false;

    setIsTemporaryChat(false);
    setTemporaryMessages([]);
    setActiveThreadId(threadId);
    const metaFromList = threadListItems.find((t) => t.id === threadId) || null;
    setActiveThreadMeta(
      metaFromList
        ? { id: metaFromList.id, createdAt: metaFromList.createdAt, updatedAt: metaFromList.updatedAt }
        : { id: threadId, createdAt: '', updatedAt: '' }
    );

    const cached = threadMessageCache[threadId];
    const hasCachedMessages = Array.isArray(cached);
    if (hasCachedMessages) {
      setActiveMessages(cached);
      setIsThreadLoading(false);
    } else {
      setActiveMessages([]);
      setIsThreadLoading(true);
    }

    const fetchedAt = threadFetchedAt[threadId] || 0;
    const shouldRevalidate = !hasCachedMessages || Date.now() - fetchedAt > THREAD_REVALIDATE_MS;
    if (!shouldRevalidate) return true;

    if (hasCachedMessages) {
      void fetchThreadMessages(threadId);
      return true;
    }

    try {
      return await fetchThreadMessages(threadId);
    } finally {
      setIsThreadLoading(false);
    }
  }, [userId, threadListItems, threadMessageCache, threadFetchedAt, fetchThreadMessages]);

  const clearActiveThread = useCallback(() => {
    setActiveThreadId(null);
    setActiveMessages([]);
    setActiveThreadMeta(null);
  }, []);

  const startTemporaryChat = useCallback(() => {
    setActiveThreadId(null);
    setActiveMessages([]);
    setActiveThreadMeta(null);
    setIsTemporaryChat(true);
    setTemporaryMessages([]);
  }, []);

  const closeTemporaryChat = useCallback(() => {
    setIsTemporaryChat(false);
    setTemporaryMessages([]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!userId) throw new Error('User not initialized');

    if (isTemporaryChat) {
      const now = new Date().toISOString();
      setTemporaryMessages((prev) => [
        ...prev,
        { role: 'user', content, timestamp: now },
        { role: 'assistant', content: '', timestamp: now },
      ]);

      await api.streamChat({
        content,
        userId,
        temporary: true,
        onDelta: (delta) => {
          const ts = new Date().toISOString();
          setTemporaryMessages((prev) => {
            if (prev.length === 0) return prev;
            const idx = prev.length - 1;
            const last = prev[idx];
            if (last?.role !== 'assistant') {
              return [...prev, { role: 'assistant', content: delta, timestamp: ts }];
            }
            const next = [...prev];
            next[idx] = { ...last, content: `${last.content || ''}${delta}`, timestamp: ts };
            return next;
          });
        },
      });
      return null;
    }

    let threadId = activeThreadId;
    const now = new Date().toISOString();
    setActiveMessages((prev) => {
      const userMessage: Message = { role: 'user', content, timestamp: now };
      const assistantPlaceholder: Message = { role: 'assistant', content: '', timestamp: now };
      const next: Message[] = [...prev, userMessage, assistantPlaceholder];
      if (threadId) {
        setThreadMessageCache((cachePrev) => ({ ...cachePrev, [threadId!]: next }));
      }
      return next;
    });

    const streamed = await api.streamChat({
      threadId: threadId || undefined,
      content,
      userId,
      onThreadMeta: (resolvedThreadId) => {
        threadId = resolvedThreadId;
        if (!activeThreadId) {
          setActiveThreadId(resolvedThreadId);
          setActiveThreadMeta({ id: resolvedThreadId, createdAt: '', updatedAt: '' });
          setActiveMessages((prev) => {
            setThreadMessageCache((cachePrev) => ({ ...cachePrev, [resolvedThreadId]: prev }));
            return prev;
          });
        }
      },
      onDelta: (delta) => {
        const ts = new Date().toISOString();
        setActiveMessages((prev) => {
          if (prev.length === 0) return prev;
          const idx = prev.length - 1;
          const last = prev[idx];
          if (last?.role !== 'assistant') {
            const appendedAssistant: Message = { role: 'assistant', content: delta, timestamp: ts };
            return [...prev, appendedAssistant];
          }
          const next = [...prev];
          next[idx] = { ...last, content: `${last.content || ''}${delta}`, timestamp: ts };
          if (threadId) {
            setThreadMessageCache((cachePrev) => ({ ...cachePrev, [threadId!]: next }));
            setThreadFetchedAt((fetchedPrev) => ({ ...fetchedPrev, [threadId!]: Date.now() }));
          }
          return next;
        });
      },
    });

    threadId = streamed.threadId;

    void refreshThreads();
    return threadId!;
  }, [userId, activeThreadId, isTemporaryChat, refreshThreads]);

  const regenerateLast = useCallback(async () => {
    if (!userId) return;

    if (isTemporaryChat) {
      const lastUserMessage = [...temporaryMessages].reverse().find((m) => m.role === 'user')?.content;
      if (!lastUserMessage) return;

      const now = new Date().toISOString();
      setTemporaryMessages((prev) => {
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          if (prev[i]?.role === 'assistant') {
            const next = [...prev];
            next[i] = { ...next[i], content: '', timestamp: now };
            return next;
          }
        }
        return [...prev, { role: 'assistant', content: '', timestamp: now }];
      });

      await api.streamChat({
        content: lastUserMessage,
        userId,
        temporary: true,
        onDelta: (delta) => {
          const ts = new Date().toISOString();
          setTemporaryMessages((prev) => {
            if (prev.length === 0) return prev;
            const idx = prev.length - 1;
            const last = prev[idx];
            if (last?.role !== 'assistant') {
              return [...prev, { role: 'assistant', content: delta, timestamp: ts }];
            }
            const next = [...prev];
            next[idx] = { ...last, content: `${last.content || ''}${delta}`, timestamp: ts };
            return next;
          });
        },
      });
      return;
    }

    if (!activeThreadId) return;

    const res = await api.regenerate(activeThreadId, userId);
    const now = new Date().toISOString();

    setActiveMessages((prev) => {
      let next = prev;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i]?.role === 'assistant') {
          next = [...prev];
          next[i] = { ...next[i], content: res.reply, timestamp: now };
          break;
        }
      }
      if (next === prev) {
        const appendedAssistant: Message = { role: 'assistant', content: res.reply, timestamp: now };
        next = [...prev, appendedAssistant];
      }
      setThreadMessageCache((cachePrev) => ({ ...cachePrev, [activeThreadId]: next }));
      setThreadFetchedAt((fetchedPrev) => ({ ...fetchedPrev, [activeThreadId]: Date.now() }));
      return next;
    });

    void refreshThreads();
  }, [userId, activeThreadId, isTemporaryChat, temporaryMessages, refreshThreads]);

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      if (!userId) return;
      await api.renameThread(threadId, title, userId);
      setThreadListItems((prev) => prev.map((t) => (t.id === threadId ? { ...t, title } : t)));
    },
    [userId]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!userId) return;
      await api.deleteThread(threadId, userId);
      setThreadListItems((prev) => prev.filter((t) => t.id !== threadId));
      setThreadMessageCache((prev) => {
        if (!(threadId in prev)) return prev;
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      setThreadFetchedAt((prev) => {
        if (!(threadId in prev)) return prev;
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      if (activeThreadId === threadId) {
        clearActiveThread();
      }
    },
    [userId, activeThreadId, clearActiveThread]
  );

  const activeThread = useMemo<Thread | null>(() => {
    if (isTemporaryChat) {
      return { id: 'temporary', createdAt: '', updatedAt: '', messages: temporaryMessages };
    }
    if (!activeThreadId) return null;
    const meta = activeThreadMeta || { id: activeThreadId, createdAt: '', updatedAt: '' };
    return { ...meta, messages: activeMessages };
  }, [isTemporaryChat, temporaryMessages, activeThreadId, activeThreadMeta, activeMessages]);

  return (
    <ChatContext.Provider 
      value={{ 
        threadListItems,
        activeThread,
        isTemporaryChat,
        userId,
        isThreadsLoading,
        isThreadLoading,
        refreshThreads,
        selectThread,
        startTemporaryChat,
        closeTemporaryChat,
        clearActiveThread,
        sendMessage,
        regenerateLast,
        renameThread,
        deleteThread,
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
