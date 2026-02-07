import type { Message } from '@/types/chat';


/**
 * MessageBubble Component
 * 
 * Displays a single message with role-based styling:
 * - User messages: Right-aligned with gray background
 * - Assistant messages: Left-aligned with transparent/light background
 * 
 * @param message - The message to display
 */
interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`w-full ${
        isUser ? 'bg-gray-100 dark:bg-[#40414F]' : 'bg-transparent dark:bg-transparent'
      }`}
    >
      <div className="w-full max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center ${
              isUser
                ? 'bg-gray-200 dark:bg-[#202123]'
                : 'bg-green-500'
            }`}
          >
            {isUser ? (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
              {isUser ? 'You' : 'Calm Sphere'}
            </div>
            <div className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
