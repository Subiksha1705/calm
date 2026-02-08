import { useMemo, useState } from 'react';
import type { ThreadListItem } from '@/types/chat';
import { ThreadItem } from './ThreadItem';
import { DeleteThreadModal } from '@/components/DeleteThreadModal';


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
  onRename?: (threadId: string, title: string) => void;
  onDelete?: (threadId: string) => Promise<void> | void;
}

export function ThreadList({ threads, activeThreadId, onSelect, onRename, onDelete }: ThreadListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteTitle = useMemo(() => {
    if (!deleteId) return '';
    const thread = threads.find((t) => t.id === deleteId);
    return thread?.title || thread?.preview || 'this chat';
  }, [deleteId, threads]);

  if (threads.length === 0) {
    return (
      <div className="flex-1 px-3 py-4 text-center text-sm text-gray-500 dark:text-white/50">
        No conversations yet
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            onClick={() => onSelect?.(thread.id)}
            onRename={(id, title) => onRename?.(id, title)}
            onDelete={(id) => setDeleteId(id)}
          />
        ))}
      </div>

      <DeleteThreadModal
        isOpen={Boolean(deleteId)}
        threadTitle={deleteTitle}
        onCancel={() => setDeleteId(null)}
        onDelete={async () => {
          if (!deleteId) return;
          const id = deleteId;
          setDeleteId(null);
          await Promise.resolve(onDelete?.(id));
        }}
      />
    </>
  );
}
