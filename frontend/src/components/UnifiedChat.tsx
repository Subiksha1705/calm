'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { EmptyChatState } from './EmptyChatState';
import { ChatInput } from './ChatInput';
import { useChat } from '@/contexts/ChatContext';


/**
 * UnifiedChat Component
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
export function UnifiedChat() {
  const { activeThread, addMessage, replaceLastAssistantMessage } = useChat();
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages from active thread (from context)
  const messages = useMemo(() => activeThread?.messages ?? [], [activeThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (!activeThread || isSending) return;

    setIsSending(true);
    
    // Add user message to thread (local state only)
    // TASK 1: No API calls - addMessage updates React state
    addMessage(content, 'user');
    
    // Add simulated assistant response (local memory only)
    // In a real app, this would be handled differently
    // For now, we just add a placeholder response
    setTimeout(() => {
      addMessage('This is a simulated response. In production, integrate with your LLM.', 'assistant');
      setIsSending(false);
    }, 500);
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op (UI-only)
    }
  };

  const handleRegenerate = () => {
    if (!activeThread || isSending || isRegenerating) return;
    setIsRegenerating(true);

    setTimeout(() => {
      replaceLastAssistantMessage(
        'This is a regenerated simulated response. In production, integrate with your LLM.'
      );
      setIsRegenerating(false);
    }, 450);
  };

  // TASK 2: Chat input positioning logic
  // Center input when thread is empty (new thread with no messages yet)
  const shouldCenterInput = activeThread === null || messages.length === 0;

  return (
    <div className="relative flex flex-col h-full">
      {/* 
        SCROLLABLE CONTENT AREA
        Only this section is conditional based on message state.
      */}
      <div className={`${shouldCenterInput ? 'flex-1' : 'flex-1 overflow-y-auto'}`}>
        {messages.length === 0 ? (
          <EmptyChatState userName="User" />
        ) : (
          <>
            <MessageList
              messages={messages}
              isRegenerating={isRegenerating}
              onCopyMessage={handleCopyMessage}
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
        } bg-gradient-to-t from-white/95 dark:from-[#343541]/95 to-transparent backdrop-blur supports-[backdrop-filter]:backdrop-blur`}
      >
        <ChatInput
          onSubmit={handleSendMessage}
          disabled={isSending}
          placeholder={isSending ? 'Sending…' : 'Ask anything'}
        />
      </div>
    </div>
  );
}
