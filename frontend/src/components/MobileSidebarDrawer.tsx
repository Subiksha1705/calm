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
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onThreadSelect,
  onNewChat,
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
        className={`fixed inset-y-0 left-0 w-80 bg-gray-50 dark:bg-[#202123] z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <NewChatButton onClick={onNewChat} />
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
      </div>
    </>
  );
}
