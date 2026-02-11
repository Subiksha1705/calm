'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageList } from './MessageList';
import { EmptyChatState } from './EmptyChatState';
import { ChatInput } from './ChatInput';
import { useChat } from '@/contexts/ChatContext';


/**
 * ChatWindow Component
 * 
 * TASK 1: Local memory only - No backend/API usage
 * 
 * Main chat area that displays messages and handles message sending.
 * Uses ChatContext for thread state instead of API calls.
 * 
 * ARCHITECTURE:
 * - Scrollable content area: Conditionally renders EmptyChatState or MessageList
 * - Fixed input area: Always rendered at the bottom
 * 
 * TASK 2: Chat input positioning
 * - ChatInput component must ALWAYS be rendered
 * - Only change its POSITION using Tailwind classes
 * - If activeThread.messages.length === 0: Center the input
 * - Else: Fix the input to the bottom
 */
export function ChatWindow() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeThread, isTemporaryChat, sendMessage, regenerateLast, closeTemporaryChat } = useChat();
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages from active thread (from context)
  const messages = useMemo(() => activeThread?.messages ?? [], [activeThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  };

  const handleSendMessage = async (content: string) => {
    if (isSending) return;
    setIsSending(true);
    const hadThread = Boolean(activeThread?.id);
    try {
      const threadId = await sendMessage(content);
      if (!threadId) return;
      if (!hadThread && pathname === '/chat') {
        router.push(`/chat/${threadId}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating || isSending) return;
    setIsRegenerating(true);
    try {
      await regenerateLast();
    } finally {
      setIsRegenerating(false);
    }
  };

  // TASK 2: Chat input positioning logic
  // Center input when thread is empty (new thread with no messages yet)
  const shouldCenterInput = activeThread === null || messages.length === 0;

  const handleCloseTemporaryChat = () => {
    closeTemporaryChat();
    router.push('/chat');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#202123]/90 backdrop-blur">
        <div className="min-w-0">
          <span className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">Calm Sphere</span>
        </div>
        {isTemporaryChat ? (
          <button
            type="button"
            onClick={handleCloseTemporaryChat}
            className="h-9 w-9 rounded-lg grid place-items-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close temporary chat"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
      {/* 
        SCROLLABLE CONTENT AREA
        Only this section is conditional based on message state.
      */}
      <div className={`${shouldCenterInput ? 'flex-1 min-h-0' : 'flex-1 min-h-0 overflow-y-auto'}`}>
        {messages.length === 0 ? (
          <EmptyChatState isTemporaryChat={isTemporaryChat} />
        ) : (
          <>
            <MessageList
              messages={messages}
              isRegenerating={isRegenerating}
              isStreaming={isSending}
              onCopyMessage={handleCopyMessage}
              onEditMessage={(text) => {
                void handleSendMessage(text);
              }}
              onRegenerate={handleRegenerate}
            />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 
        TASK 2: FIXED INPUT AREA
        ChatInput is ALWAYS rendered - never conditionally hidden.
        Users must be able to type at any time regardless of message state.
        Only change POSITION using Tailwind classes.
      */}
      <div
        className={`w-full ${
          shouldCenterInput
            ? 'absolute left-0 right-0 top-1/2 -translate-y-1/2'
            : 'sticky bottom-0'
        }`}
      >
        <ChatInput
          onSubmit={handleSendMessage}
          disabled={isSending}
          placeholder={isSending ? 'Sending…' : 'Ask anything'}
          value={composerValue}
          onChange={setComposerValue}
        />
      </div>
      </div>
    </div>
  );
}
