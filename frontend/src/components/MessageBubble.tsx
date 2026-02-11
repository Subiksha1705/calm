import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
  isLastAssistant?: boolean;
  isRegenerating?: boolean;
  isStreaming?: boolean;
  onCopy?: (text: string) => void;
  onEdit?: (text: string) => void;
  onRegenerate?: () => void;
}

export function MessageBubble({
  message,
  isLastAssistant = false,
  isRegenerating = false,
  isStreaming = false,
  onCopy,
  onEdit,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showStreamingDots =
    !isUser && isLastAssistant && isStreaming && (message.content || '').trim().length === 0;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeEditor = () => {
    const el = editRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  };

  useEffect(() => {
    if (!isEditing) return;
    editRef.current?.focus();
    const len = editRef.current?.value.length || 0;
    editRef.current?.setSelectionRange(len, len);
    resizeEditor();
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    resizeEditor();
  }, [draft, isEditing]);

  const handleCancelEdit = () => {
    setDraft(message.content);
    setIsEditing(false);
  };

  const handleSendEdit = () => {
    const next = draft.trim();
    if (!next || !onEdit) return;
    onEdit(next);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendEdit();
    }
  };

  return (
    <div className="w-full group/message">
      <div className="w-full max-w-3xl mx-auto px-4 py-4">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`min-w-0 ${isUser ? 'text-right' : 'text-left'} ${
              isUser && isEditing ? 'w-full max-w-[95%]' : 'max-w-[85%]'
            }`}
          >
            <div
              className={`text-[15px] leading-6 whitespace-pre-wrap break-words min-h-[1.5rem] ${
                isUser
                  ? isEditing
                    ? 'block w-full rounded-[2rem] px-5 py-4 bg-gray-200 text-gray-900 border border-gray-300/70 dark:bg-[#44464b] dark:text-gray-100 dark:border-white/10'
                    : 'inline-block rounded-2xl px-4 py-2 bg-gray-200 text-gray-900 border border-gray-300/70 dark:bg-[#202123] dark:text-gray-100 dark:border-white/10'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {isUser && isEditing ? (
                <>
                  <textarea
                    ref={editRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    rows={1}
                    className="w-full bg-transparent border-none outline-none resize-none min-h-[48px] max-h-[360px] overflow-y-auto"
                    aria-label="Edit message"
                  />
                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-full px-5 py-2.5 text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-[#1f2023] dark:text-gray-100 dark:hover:bg-[#2a2b2f] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEdit}
                      disabled={!draft.trim()}
                      className="rounded-full px-5 py-2.5 text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-white/90 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : showStreamingDots ? (
                <span className="inline-flex items-center gap-1.5 align-middle" aria-label="Assistant is typing">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                </span>
              ) : (
                message.content
              )}
            </div>

            {isUser && !isEditing && (onCopy || onEdit) ? (
              <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-gray-500 dark:text-white/50 opacity-0 group-hover/message:opacity-100 transition-opacity">
                {onCopy ? (
                  <button
                    type="button"
                    onClick={() => onCopy(message.content)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Copy message"
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

                {onEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(message.content);
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Edit message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 20h4l10-10a2.121 2.121 0 0 0-3-3L5 17v3Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Edit
                  </button>
                ) : null}
              </div>
            ) : null}

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
