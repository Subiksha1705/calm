'use client';

import { useState } from 'react';
import { UnifiedChat } from '@/components/UnifiedChat';
import { ChatInput } from '@/components/ChatInput';
import { useChat } from '@/contexts/ChatContext';


/**
 * Chat Page Route (Empty State)
 * 
 * This is the route for /chat when no thread is selected.
 * 
 * TASK 2: Chat input positioning
 * - If activeThread is null OR activeThread.messages.length === 0:
 *   - Center the input vertically in the chat area
 * - Else:
 *   - Fix the input to the bottom
 * 
 * TASK 4: Create thread on first message
 * - When user sends a message AND activeThread is null:
 *   - Create a new thread
 *   - Add the message to it
 *   - Add the thread to the sidebar
 *   - Set it as active
 */
export default function ChatPage() {
  const { activeThread, createThread } = useChat();
  const [isSending, setIsSending] = useState(false);

  // Check if we have an active thread with messages
  const hasMessages = activeThread !== null && activeThread.messages.length > 0;

  // If we have an active thread with messages, show the UnifiedChat
  if (hasMessages) {
    return <UnifiedChat />;
  }

  // Otherwise, show the empty state with centered input
  return (
    <div className="flex flex-col h-full justify-center">
      {/* Empty State - Centered content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Good to see you, User.
          </h2>
        </div>
      </div>
      
      {/* 
        TASK 2: ChatInput is ALWAYS rendered
        Do NOT conditionally render ChatInput
        Only change its POSITION using Tailwind classes
      */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#343541]">
        <ChatInputWrapper
          isSending={isSending}
          onSendingChange={setIsSending}
          createThread={createThread}
        />
      </div>
    </div>
  );
}


/**
 * ChatInputWrapper Component
 * 
 * Handles the first message case - creates a thread when user sends first message.
 */
interface ChatInputWrapperProps {
  isSending: boolean;
  onSendingChange: (sending: boolean) => void;
  createThread: (message: string) => void;
}

function ChatInputWrapper({ isSending, onSendingChange, createThread }: ChatInputWrapperProps) {
  const handleSendMessage = (content: string) => {
    onSendingChange(true);
    
    // TASK 4: Create thread on first message
    createThread(content);
    
    onSendingChange(false);
  };

  return (
    <ChatInput
      onSubmit={handleSendMessage}
      disabled={isSending}
      placeholder={isSending ? 'Sending...' : 'Send a message...'}
    />
  );
}
