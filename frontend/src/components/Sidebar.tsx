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

  // TODO: Replace with real auth/user profile once available
  const userDisplayName = 'User';

  // Handle new chat - clear active thread and navigate to /chat
  const handleNewChat = () => {
    clearActiveThread();
    router.push('/chat');
    setIsMobileDrawerOpen(false);
  };

  // TASK 5: Thread continuation - Load messages when clicking sidebar thread
  // Also navigate to /chat/{threadId} for URL consistency
  const handleThreadSelect = async (threadId: string) => {
    await selectThread(threadId);
    router.push(`/chat/${threadId}`);
    // Close mobile drawer if open
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-white dark:bg-[#202123] border-r border-gray-200/70 dark:border-white/10">
        {/* Top: New Chat */}
        <div className="p-2">
          {/* TASK 3: New chat clears activeThread instead of creating thread */}
          <NewChatButton onClick={handleNewChat} />
        </div>

        {/* Chats */}
        <div className="px-3 pt-2 pb-1 text-xs font-medium text-gray-500 dark:text-white/50">
          Your chats
        </div>

        {/* Thread List - Uses threadListItems from ChatContext */}
        <ThreadList
          threads={threadListItems}
          activeThreadId={activeThread?.id || null}
          onSelect={handleThreadSelect}
        />

        {/* Bottom: Profile */}
        <div className="p-2 border-t border-gray-200/70 dark:border-white/10">
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Open profile"
          >
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-100">
              {userDisplayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                {userDisplayName}
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-white/50">
                Free
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebarDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        threads={threadListItems}
        activeThreadId={activeThread?.id || null}
        onThreadSelect={handleThreadSelect}
        onNewChat={handleNewChat}
        userDisplayName={userDisplayName}
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
