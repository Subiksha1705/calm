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
  isRegenerating?: boolean;
  onCopyMessage?: (text: string) => void;
  onRegenerate?: () => void;
}

export function MessageList({
  messages,
  isRegenerating = false,
  onCopyMessage,
  onRegenerate,
}: MessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  // Only show actions on the latest assistant message (ChatGPT-like)
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'assistant') {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div className="w-full pb-24">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          isLastAssistant={index === lastAssistantIndex}
          isRegenerating={isRegenerating}
          onCopy={onCopyMessage}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
}
