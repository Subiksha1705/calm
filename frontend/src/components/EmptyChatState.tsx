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
export function EmptyChatState() {
  const [title, setTitle] = useState('Ready when you are.');

  useEffect(() => {
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
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center">
        {/* 
          EMPTY STATE: Only show greeting text.
          No suggestion cards, no example prompts, no helper UI.
          This matches ChatGPT's empty state behavior.
        */}
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>
    </div>
  );
}
