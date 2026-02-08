'use client';

import { useEffect } from 'react';

export function LogoutConfirmModal({
  isOpen,
  email,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  email?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[420px] max-w-[90vw] rounded-2xl bg-[#2A2B32] border border-white/10 px-8 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
        <div className="text-center text-2xl font-semibold whitespace-pre-line">Are you sure you{'\n'}want to log out?</div>
        <div className="mt-5 text-center text-sm text-white/70">
          Log out of Calm Sphere as
          <div className="mt-1 text-white">{email || 'this account'}?</div>
        </div>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
