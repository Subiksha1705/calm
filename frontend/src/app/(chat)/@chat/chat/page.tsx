'use client';

import { useEffect } from 'react';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/contexts/ChatContext';

/**
 * Chat Page Route (Empty State)
 *
 * Route for /chat when no thread is selected.
 */
export default function ChatPage() {
  const { clearActiveThread } = useChat();

  useEffect(() => {
    clearActiveThread();
  }, [clearActiveThread]);

  return <ChatWindow />;
}
