'use client';

import { useEffect } from 'react';

export function DeleteThreadModal({
  isOpen,
  threadTitle,
  onCancel,
  onDelete,
}: {
  isOpen: boolean;
  threadTitle: string;
  onCancel: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[520px] max-w-[92vw] rounded-2xl bg-[#2A2B32] border border-white/10 px-6 py-5 shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
        <div className="text-lg font-semibold text-white">Delete chat?</div>
        <div className="mt-2 text-sm text-white/70">
          This will delete <span className="font-semibold text-white">{threadTitle}</span>.
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

