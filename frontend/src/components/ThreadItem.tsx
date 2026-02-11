import { useEffect, useRef, useState } from 'react';
import type { ThreadListItem } from '@/types/chat';


/**
 * ThreadItem Component
 * 
 * Displays a single thread in the thread list.
 * Features:
 * - Active state highlighting
 * - Preview text truncation
 * - Click handler for navigation
 * 
 * @param thread - The thread data to display
 * @param isActive - Whether this thread is currently selected
 * @param onClick - Click handler
 */
interface ThreadItemProps {
  thread: ThreadListItem;
  isActive?: boolean;
  onClick?: () => void;
  onRename?: (threadId: string, title: string) => void;
  onDelete?: (threadId: string) => void;
}

function summarizeTitle(text: string): string {
  const cleaned = text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .trim();
  if (!cleaned) return 'New chat';
  const words = cleaned.split(/\s+/).slice(0, 3);
  return words.join(' ');
}

export function ThreadItem({ thread, isActive = false, onClick, onRename, onDelete }: ThreadItemProps) {
  const title = summarizeTitle(thread.title || thread.preview || 'New chat');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-thread-actions="true"]')) return;
        setMenuOpen(false);
        onClick?.();
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-thread-actions="true"]')) return;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMenuOpen(false);
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      className={`group relative isolate w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-white/30 ${
        menuOpen ? 'z-40' : ''
      } ${
        isActive
          ? 'bg-gray-100 dark:bg-white/10'
          : 'hover:bg-gray-50 dark:hover:bg-white/10'
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setIsEditing(false);
              setDraft(title);
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              const nextTitle = draft.trim();
              if (nextTitle && onRename) onRename(thread.id, nextTitle);
              setIsEditing(false);
              setMenuOpen(false);
            }
          }}
          className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none"
        />
      ) : (
        <div className="text-sm text-gray-900 dark:text-gray-100 truncate pr-8">{title}</div>
      )}

      {/* Actions */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 z-50"
        data-thread-actions="true"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Thread actions"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="h-7 w-7 rounded-md grid place-items-center text-gray-500 dark:text-white/60 hover:bg-gray-200/70 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 12h.01M12 12h.01M18 12h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {menuOpen ? (
          <div
            className="absolute right-0 mt-2 w-40 rounded-xl bg-white dark:bg-[#202123] border border-gray-200/70 dark:border-white/10 shadow-xl overflow-hidden z-[60]"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setDraft(title);
                setIsEditing(true);
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              Rename
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete?.(thread.id);
              }}
              className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
