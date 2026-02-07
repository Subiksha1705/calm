import type { ThreadListItem } from '@/types/chat';
import { ThreadItem } from './ThreadItem';


/**
 * ThreadList Component
 * 
 * Scrollable container that displays all conversation threads.
 * 
 * @param threads - Array of threads to display
 * @param activeThreadId - Currently selected thread ID
 * @param onSelect - Callback when a thread is selected
 */
interface ThreadListProps {
  threads: ThreadListItem[];
  activeThreadId?: string | null;
  onSelect?: (threadId: string) => void;
}

export function ThreadList({ threads, activeThreadId, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeThreadId}
          onClick={() => onSelect?.(thread.id)}
        />
      ))}
    </div>
  );
}
