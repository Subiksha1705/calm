'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * EmptyChatState Component
 * 
 * Displays the empty chat state when no messages exist in a thread.
 * 
 * EMPTY STATE REQUIREMENTS:
 * - Vertically centered greeting text
 * - No suggestion cards
 * - No example prompts
 * - No onboarding UI
 * - Input bar remains visible in parent component
 * 
 * This matches ChatGPT's empty state behavior exactly.
 * 
 */
interface EmptyChatStateProps {
  isTemporaryChat?: boolean;
}

export function EmptyChatState({ isTemporaryChat = false }: EmptyChatStateProps) {
  const [title, setTitle] = useState('Ready when you are.');

  useEffect(() => {
    if (isTemporaryChat) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getReadyMessage();
        const next = (res.message || '').trim();
        if (!cancelled && next) {
          setTitle(next);
        }
      } catch {
        // Keep fallback title.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTemporaryChat]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center">
        {isTemporaryChat ? (
          <>
            <h2 className="text-5xl font-medium tracking-tight text-gray-900 dark:text-gray-100">
              Temporary Chat
            </h2>
            <p className="mt-6 max-w-3xl text-lg text-gray-500 dark:text-gray-300/70">
              This chat won&apos;t appear in your chat history, and won&apos;t be used to train our models.
            </p>
          </>
        ) : (
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        )}
      </div>
    </div>
  );
}
