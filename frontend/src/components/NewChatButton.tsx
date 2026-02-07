'use client';

import { useState } from 'react';


/**
 * NewChatButton Component
 * 
 * TASK 3: New chat behavior
 * - Clicking "+ New chat" should:
 *   - Clear activeThread (set to null)
 *   - Show greeting text: "Good to see you, User."
 *   - NOT create a thread yet
 * 
 * @param onClick - Click handler (clears active thread)
 */
interface NewChatButtonProps {
  onClick?: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (isLoading) return;
    
    setIsLoading(true);
    // Small delay for visual feedback
    setTimeout(() => {
      setIsLoading(false);
      onClick?.();
    }, 100);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200/70 dark:border-white/10 bg-white dark:bg-[#202123] text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="text-sm font-medium truncate">
        {isLoading ? 'Loading...' : 'New chat'}
      </span>
    </button>
  );
}
