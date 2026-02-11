'use client';

import { useState } from 'react';
import Image from 'next/image';
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
  const {
    threadListItems,
    activeThread,
    selectThread,
    startTemporaryChat,
    closeTemporaryChat,
    clearActiveThread,
    renameThread,
    deleteThread,
  } = useChat();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Handle new chat - clear active thread and navigate to /chat
  const handleNewChat = () => {
    closeTemporaryChat();
    clearActiveThread();
    router.push('/chat');
    setIsMobileDrawerOpen(false);
  };

  const handleTemporaryChat = () => {
    startTemporaryChat();
    router.push('/chat');
    setIsMobileDrawerOpen(false);
  };

  // TASK 5: Thread continuation - Load messages when clicking sidebar thread
  // Also navigate to /chat/{threadId} for URL consistency
  const handleThreadSelect = (threadId: string) => {
    closeTemporaryChat();
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
      <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] border-r border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 px-3 py-3">
          <Image
            src="/calm.png"
            alt="Calm Sphere logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover"
          />
          <span className="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
            Calm Sphere
          </span>
        </div>

        {/* Top: New Chat */}
        <div className="p-2">
          {/* TASK 3: New chat clears activeThread instead of creating thread */}
          <NewChatButton onClick={handleNewChat} />
        </div>

        <div className="px-2 pb-1">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-white/30 cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Search chats
          </button>
        </div>

        <div className="px-2 pb-1 space-y-1.5">
          <button
            type="button"
            onClick={handleTemporaryChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            </svg>
            Temporary chat
          </button>
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-white/35 cursor-not-allowed bg-gray-100/70 dark:bg-white/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M3.5 18a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M14.5 18a4.5 4.5 0 0 1 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Group chat (soon)
          </button>
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
        <div className="p-2 border-t border-gray-200 dark:border-white/10">
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
        onNewTemporaryChat={handleTemporaryChat}
        onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/90 dark:bg-[rgba(255,255,255,0.05)] border border-gray-200 dark:border-white/10 shadow-md"
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
