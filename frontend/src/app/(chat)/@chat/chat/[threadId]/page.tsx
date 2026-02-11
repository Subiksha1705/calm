'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/contexts/ChatContext';

/**
 * Chat Thread Page
 *
 * Renders when a specific thread is selected (/chat/{threadId}).
 */
export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { selectThread, isThreadLoading, activeThread, isTemporaryChat } = useChat();

  const threadId = params.threadId as string;

  useEffect(() => {
    if (!threadId) return;
    if (isTemporaryChat) return;
    if (activeThread?.id === threadId) return;
    void (async () => {
      const ok = await selectThread(threadId);
      if (!ok) router.push('/chat');
    })();
  }, [threadId, selectThread, router, activeThread?.id, isTemporaryChat]);

  if (isThreadLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return <ChatWindow />;
}
