'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';

function initials(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'U';
}

export function ProfileMenu({ onAction }: { onAction?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'User');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (e.target instanceof Node && containerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        aria-label="Open profile"
      >
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-100">
          {initials(displayName)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm text-gray-900 dark:text-gray-100">{displayName}</div>
          <div className="truncate text-xs text-gray-500 dark:text-white/50">{user?.email || ''}</div>
        </div>
      </button>

      {open ? (
        <div className="absolute bottom-14 left-0 right-0 rounded-xl bg-white dark:bg-[#202123] border border-gray-200/70 dark:border-white/10 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200/70 dark:border-white/10">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</div>
            <div className="text-xs text-gray-500 dark:text-white/50 truncate">{user?.email || ''}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAction?.();
              router.push('/settings');
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmLogout(true);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            Log out
          </button>
        </div>
      ) : null}

      <LogoutConfirmModal
        isOpen={confirmLogout}
        email={user?.email}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          onAction?.();
          await logout();
          router.replace('/auth?mode=login');
        }}
      />
    </div>
  );
}
