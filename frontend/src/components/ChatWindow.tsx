'use client';

import { useState, useEffect, useRef } from 'react';
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
  const { activeThread, addMessage } = useChat();
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages from active thread (from context)
  const messages = activeThread?.messages || [];

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

  // TASK 2: Chat input positioning logic
  // Center input when thread is empty (new thread with no messages yet)
  const shouldCenterInput = activeThread === null || messages.length === 0;

  return (
    <div className={`flex flex-col h-full ${shouldCenterInput ? 'justify-center' : ''}`}>
      {/* 
        SCROLLABLE CONTENT AREA
        Only this section is conditional based on message state.
      */}
      <div className={`${shouldCenterInput ? 'absolute inset-0 flex items-center justify-center' : 'flex-1 overflow-y-auto'}`}>
        {messages.length === 0 ? (
          <EmptyChatState userName="User" />
        ) : (
          <>
            <MessageList messages={messages} />
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
      <div className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#343541] ${
        shouldCenterInput ? 'absolute bottom-0 left-0 right-0' : ''
      }`}>
        <ChatInput
          onSubmit={handleSendMessage}
          disabled={isSending}
          placeholder={isSending ? 'Sending...' : 'Send a message...'}
        />
      </div>
    </div>
  );
}
