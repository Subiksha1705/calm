'use client';

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
        {/* Drawer Header */}
        <div className="p-2 border-b border-gray-200 dark:border-white/10">
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
