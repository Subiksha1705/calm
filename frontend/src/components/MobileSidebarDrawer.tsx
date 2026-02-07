'use client';

import type { ThreadListItem } from '@/types/chat';
import { NewChatButton } from './NewChatButton';
import { ThreadList } from './ThreadList';


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
  userDisplayName?: string;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onThreadSelect,
  onNewChat,
  userDisplayName = 'User',
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
        className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-[#202123] z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-2 border-b border-gray-200/70 dark:border-white/10">
          <NewChatButton onClick={onNewChat} />
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
      </div>
    </>
  );
}
