'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';


/**
 * ChatInput Component
 * 
 * A textarea-based input component for sending messages.
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Sticky positioning at bottom of chat area
 * - Disabled state while sending
 * 
 * @param onSubmit - Callback when message is sent
 * @param disabled - Whether input is disabled
 * @param placeholder - Placeholder text
 */
interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Send a message...'
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="relative flex items-end gap-2 bg-white dark:bg-[#40414F] rounded-xl border border-gray-300 dark:border-[#565869] shadow-sm overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full px-4 py-3 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[52px] max-h-[200px] overflow-y-auto"
          aria-label="Chat message input"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={`p-2 mb-2 mr-2 rounded-lg transition-colors ${
            value.trim() && !disabled
              ? 'bg-gray-100 dark:bg-[#202123] text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#2A2B32]'
              : 'bg-gray-50 dark:bg-[#40414F] text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
          >
            <path
              d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
        Calm Sphere can make mistakes. Please verify important information.
      </p>
    </div>
  );
}
