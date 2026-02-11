'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { ThreadListItem } from '@/types/chat';

interface SearchChatsModalProps {
  isOpen: boolean;
  userId: string | null;
  recentThreads: ThreadListItem[];
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  onNewChat?: () => void;
}

interface SearchResultItem {
  thread_id: string;
  title: string;
  preview: string;
  match_preview: string;
  match_count: number;
  created_at: string;
  last_updated: string;
}

function formatRelativeDate(value: string): string {
  const dt = value ? new Date(value) : null;
  if (!dt || Number.isNaN(dt.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < dayMs) return 'Today';
  if (diffMs < dayMs * 2) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SearchChatsModal({
  isOpen,
  userId,
  recentThreads,
  onClose,
  onSelectThread,
  onNewChat,
}: SearchChatsModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!userId) {
      setResults([]);
      setLoading(false);
      setError('Sign in required');
      return;
    }

    setLoading(true);
    setError(null);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await api.searchThreads(trimmed, userId, 20);
        setResults(response.threads || []);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || 'Search failed');
        } else {
          setError('Search failed');
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [query, isOpen, userId]);

  const fallbackRecent = useMemo(
    () =>
      recentThreads.slice(0, 12).map((t) => ({
        thread_id: t.id,
        title: t.title || t.preview || 'New chat',
        preview: t.preview,
        match_preview: t.preview,
        match_count: 1,
        created_at: t.createdAt,
        last_updated: t.updatedAt,
      })),
    [recentThreads]
  );

  const visibleItems = query.trim() ? results : fallbackRecent;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 px-4 py-10 sm:px-6" role="dialog" aria-modal="true">
      <div className="mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl border border-gray-200/20 bg-[#2f3034] text-gray-100 shadow-2xl">
        <div className="flex items-center border-b border-white/10 px-4 sm:px-5">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="h-16 flex-1 bg-transparent text-3xl leading-tight text-gray-100 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            aria-label="Close search"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {onNewChat ? (
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-base text-gray-100 hover:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New chat
            </button>
          ) : null}

          {loading ? <div className="px-3 py-5 text-sm text-gray-300">Searching...</div> : null}
          {error ? <div className="px-3 py-5 text-sm text-red-300">{error}</div> : null}
          {!loading && !error && visibleItems.length === 0 ? (
            <div className="px-3 py-5 text-sm text-gray-300">No chats found</div>
          ) : null}

          {!loading && !error
            ? visibleItems.map((item) => (
                <button
                  key={item.thread_id}
                  type="button"
                  onClick={() => {
                    onSelectThread(item.thread_id);
                    onClose();
                  }}
                  className="mb-1 w-full rounded-xl px-3 py-2 text-left hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base text-gray-100">{item.title || 'New chat'}</div>
                      <div className="mt-0.5 truncate text-sm text-gray-300">
                        {item.match_preview || item.preview}
                      </div>
                    </div>
                    <div className="pt-0.5 text-xs text-gray-300">{formatRelativeDate(item.last_updated)}</div>
                  </div>
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
