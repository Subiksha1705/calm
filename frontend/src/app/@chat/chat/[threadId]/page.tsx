'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/contexts/ChatContext';


/**
 * Chat Thread Page
 * 
 * This page renders when a specific thread is selected (/chat/{threadId}).
 * It displays the chat window with all messages for that thread.
 * 
 * The @sidebar parallel route persists across this navigation,
 * so the sidebar doesn't re-render when switching threads.
 * 
 * TASK 5: Thread continuation
 * - When clicking a thread in the sidebar:
 *   - Load its messages
 *   - New messages append to the same thread
 * 
 * Since we're using local state (ChatContext), this page:
 * 1. Gets the threadId from URL params
 * 2. Finds and selects the thread in ChatContext
 * 3. Renders the chat UI
 */
export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { selectThread, isThreadLoading, activeThread } = useChat();
  
  const threadId = params.threadId as string;

  // Select the thread when the page loads
  useEffect(() => {
    if (!threadId) return;
    if (activeThread?.id === threadId) return;
    void (async () => {
      const ok = await selectThread(threadId);
      if (!ok) router.push('/chat');
    })();
  }, [threadId, selectThread, router, activeThread?.id]);

  if (isThreadLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return <ChatWindow />;
}
