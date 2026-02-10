'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewChatButton } from './NewChatButton';
import { ThreadList } from './ThreadList';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { useChat } from '@/contexts/ChatContext';
import { ProfileMenu } from '@/components/ProfileMenu';


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
  const { threadListItems, activeThread, selectThread, clearActiveThread, renameThread, deleteThread } = useChat();
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
    void selectThread(threadId);
    router.push(`/chat/${threadId}`);
    // Close mobile drawer if open
    setIsMobileDrawerOpen(false);
  };

  const handleRenameThread = async (threadId: string, title: string) => {
    await renameThread(threadId, title);
  };

  const handleDeleteThread = async (threadId: string) => {
    await deleteThread(threadId);
    if (activeThread?.id === threadId) {
      router.push('/chat');
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-[rgba(255,255,255,0.05)] border-r border-white/10">
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
          onRename={handleRenameThread}
          onDelete={handleDeleteThread}
        />

        {/* Bottom: Profile */}
        <div className="p-2 border-t border-white/10">
          <ProfileMenu />
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
        onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-[rgba(255,255,255,0.05)] shadow-md"
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
