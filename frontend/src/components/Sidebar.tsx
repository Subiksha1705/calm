'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewChatButton } from './NewChatButton';
import { ThreadList } from './ThreadList';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { useChat } from '@/contexts/ChatContext';


/**
 * Sidebar Component
 * 
 * TASK 1: Local memory only - No backend/API usage
 * 
 * Fixed sidebar that displays the conversation list.
 * Desktop: Permanently visible on left side
 * Mobile: Hidden, opens as slide drawer
 * 
 * Uses ChatContext for thread state instead of props and API calls.
 * 
 * Features:
 * - New chat button (fixed at top)
 * - Scrollable thread list
 * - Active thread highlighting
 * - Mobile slide drawer with backdrop
 */
export function Sidebar() {
  const router = useRouter();
  const { threadListItems, activeThread, selectThread, clearActiveThread } = useChat();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Handle new chat - clear active thread and navigate to /chat
  const handleNewChat = () => {
    clearActiveThread();
    router.push('/chat');
    setIsMobileDrawerOpen(false);
  };

  // TASK 5: Thread continuation - Load messages when clicking sidebar thread
  // Also navigate to /chat/{threadId} for URL consistency
  const handleThreadSelect = (threadId: string) => {
    selectThread(threadId);
    router.push(`/chat/${threadId}`);
    // Close mobile drawer if open
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-gray-50 dark:bg-[#202123] border-r border-gray-200 dark:border-gray-700">
        {/* New Chat Button */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          {/* TASK 3: New chat clears activeThread instead of creating thread */}
          <NewChatButton onClick={handleNewChat} />
        </div>

        {/* Thread List - Uses threadListItems from ChatContext */}
        <ThreadList
          threads={threadListItems}
          activeThreadId={activeThread?.id || null}
          onSelect={handleThreadSelect}
        />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebarDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        threads={threadListItems}
        activeThreadId={activeThread?.id || null}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-[#40414F] shadow-md"
        aria-label="Open sidebar"
      >
        <svg
          className="w-6 h-6 text-gray-700 dark:text-gray-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </>
  );
}
