'use client';

import { ChatWindow } from '@/components/ChatWindow';


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
  return <ChatWindow />;
}
