import type { ThreadListItem } from '@/types/chat';


/**
 * ThreadItem Component
 * 
 * Displays a single thread in the thread list.
 * Features:
 * - Active state highlighting
 * - Preview text truncation
 * - Click handler for navigation
 * 
 * @param thread - The thread data to display
 * @param isActive - Whether this thread is currently selected
 * @param onClick - Click handler
 */
interface ThreadItemProps {
  thread: ThreadListItem;
  isActive?: boolean;
  onClick?: () => void;
}

export function ThreadItem({ thread, isActive = false, onClick }: ThreadItemProps) {
  // Format the thread title from preview or generate one
  const title = thread.preview 
    ? thread.preview.slice(0, 40) + (thread.preview.length > 40 ? '...' : '')
    : 'New Chat';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-gray-100 dark:bg-[#2A2B32]'
          : 'hover:bg-gray-50 dark:hover:bg-[#2A2B32]'
      }`}
    >
      <div className="text-sm text-gray-800 dark:text-gray-100 truncate">
        {title}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {new Date(thread.updatedAt).toLocaleDateString()}
      </div>
    </button>
  );
}
