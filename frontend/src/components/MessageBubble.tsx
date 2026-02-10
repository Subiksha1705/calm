import type { Message } from '@/types/chat';


/**
 * MessageBubble Component
 * 
 * Displays a single message with ChatGPT-like styling:
 * - No avatars
 * - No message card backgrounds
 * - User messages are right-aligned
 * - Assistant messages are left-aligned with actions (Copy/Regenerate) on the latest assistant message
 * 
 * @param message - The message to display
 */
interface MessageBubbleProps {
  message: Message;
  isLastAssistant?: boolean;
  isRegenerating?: boolean;
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
}

export function MessageBubble({
  message,
  isLastAssistant = false,
  isRegenerating = false,
  isStreaming = false,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showStreamingDots =
    !isUser && isLastAssistant && isStreaming && (message.content || '').trim().length === 0;

  return (
    <div className="w-full">
      <div className="w-full max-w-3xl mx-auto px-4 py-4">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`min-w-0 ${isUser ? 'text-right' : 'text-left'} max-w-[85%]`}>
            <div className="text-[15px] leading-6 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words min-h-[1.5rem]">
              {showStreamingDots ? (
                <span className="inline-flex items-center gap-1.5 align-middle" aria-label="Assistant is typing">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                </span>
              ) : (
                message.content
              )}
            </div>

            {!isUser && isLastAssistant && !isStreaming && (onCopy || onRegenerate) ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50">
                {onCopy ? (
                  <button
                    type="button"
                    onClick={() => onCopy(message.content)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Copy response"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M9 9h10v10H9V9Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Copy
                  </button>
                ) : null}

                {onRegenerate ? (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Regenerate response"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21 12a9 9 0 1 1-3.4-7.1"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 3v6h-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {isRegenerating ? 'Regenerating…' : 'Regenerate'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
