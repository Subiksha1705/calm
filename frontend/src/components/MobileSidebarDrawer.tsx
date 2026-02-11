'use client';

import Image from 'next/image';
import type { ThreadListItem } from '@/types/chat';
import { NewChatButton } from './NewChatButton';
import { ThreadList } from './ThreadList';
import { ProfileMenu } from '@/components/ProfileMenu';


/**
 * MobileSidebarDrawer Component
 * 
 * Slide-in drawer sidebar for mobile devices.
 * Features:
 * - Full-screen slide animation
 * - Backdrop overlay
 * - Click backdrop to close
 * - New chat button and thread list
 * 
 * @param isOpen - Whether drawer is visible
 * @param onClose - Callback to close drawer
 * @param threads - List of threads
 * @param activeThreadId - Currently selected thread
 * @param onThreadSelect - Callback when thread is selected
 * @param onNewChat - Callback for new chat button
 */
interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ThreadListItem[];
  activeThreadId?: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewChat?: () => void;
  onSearchChats?: () => void;
  onNewTemporaryChat?: () => void;
  onRenameThread?: (threadId: string, title: string) => void;
  onDeleteThread?: (threadId: string) => Promise<void> | void;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onThreadSelect,
  onNewChat,
  onSearchChats,
  onNewTemporaryChat,
  onRenameThread,
  onDeleteThread,
}: MobileSidebarDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-80 bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] border-r border-gray-200 dark:border-white/10 z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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

        {/* Drawer Header */}
        <div className="p-2 border-b border-gray-200 dark:border-white/10">
          <NewChatButton onClick={onNewChat} />
        </div>

        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={onSearchChats}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
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
            onClick={onNewTemporaryChat}
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

        <div className="px-3 pt-2 pb-1 text-xs font-medium text-gray-500 dark:text-white/50">
          Your chats
        </div>

        {/* Thread List */}
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId || undefined}
          onSelect={(threadId) => {
            onThreadSelect(threadId);
            onClose();
          }}
          onRename={onRenameThread}
          onDelete={async (threadId) => {
            await Promise.resolve(onDeleteThread?.(threadId));
            onClose();
          }}
        />

        {/* Bottom: Profile */}
        <div className="p-2 border-t border-gray-200 dark:border-white/10">
          <ProfileMenu onAction={onClose} />
        </div>
      </div>
    </>
  );
}
