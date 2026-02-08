'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="text-lg font-semibold">Something went wrong</div>
        <div className="mt-2 text-sm text-white/60 break-words">{error.message}</div>
        <button
          type="button"
          onClick={reset}
          className="mt-5 w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
