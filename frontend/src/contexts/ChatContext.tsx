'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Thread, ThreadListItem } from '@/types/chat';


/**
 * ChatContext - Local memory state management for chat threads
 * 
 * TASK 1: Remove all backend/API usage - Store threads in React state
 * 
 * This context provides:
 * - threads: Array of all threads (stored in local memory)
 * - threadListItems: Derived list items for sidebar display
 * - activeThread: Currently selected thread (null when no thread selected)
 * - createThread: Creates a new thread with a message
 * - selectThread: Loads an existing thread
 * - addMessage: Adds a message to the active thread
 * - clearActiveThread: Clears active thread (shows greeting)
 */

// Generate unique thread ID
const generateThreadId = () => `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface ChatContextType {
  // Thread state - full Thread objects
  threads: Thread[];
  // Thread list items for sidebar display
  threadListItems: ThreadListItem[];
  // Active thread (null when no thread selected)
  activeThread: Thread | null;
  
  // Thread actions
  createThread: (message: string) => Thread;
  selectThread: (threadId: string) => void;
  clearActiveThread: () => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
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
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  // Derive ThreadListItem from Thread for sidebar display
  const threadListItems: ThreadListItem[] = threads.map(thread => ({
    id: thread.id,
    preview: thread.messages[thread.messages.length - 1]?.content.slice(0, 50) || 'New Chat',
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  }));

  // Create a new thread with the first message
  // TASK 4: Create thread on first message
  const createThread = useCallback((message: string): Thread => {
    const now = new Date().toISOString();
    const newThread: Thread = {
      id: generateThreadId(),
      messages: [{ role: 'user', content: message }],
      createdAt: now,
      updatedAt: now,
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThread(newThread);
    return newThread;
  }, []);

  // Select an existing thread
  // TASK 5: Thread continuation - Load messages when clicking sidebar thread
  const selectThread = useCallback((threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setActiveThread(thread);
    }
  }, [threads]);

  // Clear active thread - shows greeting
  // TASK 3: New chat behavior - Clear activeThread (set to null)
  const clearActiveThread = useCallback(() => {
    setActiveThread(null);
  }, []);

  // Add a message to the active thread
  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    if (!activeThread) return;

    const updatedThread: Thread = {
      ...activeThread,
      messages: [...activeThread.messages, { role, content }],
      updatedAt: new Date().toISOString(),
    };

    // Update threads array
    setThreads(prev => prev.map(t => 
      t.id === activeThread.id ? updatedThread : t
    ));

    // Update active thread
    setActiveThread(updatedThread);
  }, [activeThread]);

  return (
    <ChatContext.Provider 
      value={{ 
        threads,
        threadListItems,
        activeThread, 
        createThread, 
        selectThread, 
        clearActiveThread,
        addMessage,
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
