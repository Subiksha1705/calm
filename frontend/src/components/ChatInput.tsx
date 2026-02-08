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
  placeholder = 'Ask anything'
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
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-4">
      <div className="relative flex items-end gap-2 bg-black/70 rounded-3xl border border-white/10 shadow-sm px-2 py-2">
        <button
          type="button"
          className="flex-shrink-0 h-9 w-9 rounded-full grid place-items-center text-white/70 hover:bg-white/10 transition-colors"
          aria-label="Add attachment"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full px-1 py-2 bg-transparent border-none outline-none resize-none text-white placeholder:text-white/40 min-h-[40px] max-h-[200px] overflow-y-auto"
          aria-label="Chat message input"
        />

        <button
          type="button"
          disabled
          className="flex-shrink-0 h-9 w-9 rounded-full grid place-items-center text-white/30 cursor-not-allowed"
          aria-label="Voice input"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 18v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={`flex-shrink-0 h-9 w-9 rounded-full grid place-items-center transition-colors ${
            value.trim() && !disabled
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
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
              d="M12 5v14M12 5l-6 6M12 5l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-center text-white/40 mt-2">
        Calm Sphere can make mistakes. Please verify important information.
      </p>
    </div>
  );
}
