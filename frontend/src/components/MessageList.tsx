import type { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';


/**
 * MessageList Component
 * 
 * Scrollable container that displays all messages in a conversation.
 * Messages are ordered chronologically (oldest at top).
 * 
 * @param messages - Array of messages to display
 */
interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="w-full pb-4">
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}
    </div>
  );
}
