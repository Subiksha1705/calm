'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { completeEmailLinkSignIn, getPendingEmail, isEmailLink } = useAuth();

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/chat';
    try {
      return new URLSearchParams(window.location.search).get('next') || '/chat';
    } catch {
      return '/chat';
    }
  }, []);

  const initialView = useMemo(() => {
    if (typeof window === 'undefined') return { status: 'loading' as const, error: null as string | null };
    const href = window.location.href;
    if (!isEmailLink(href)) return { status: 'error' as const, error: 'Invalid sign-in link.' };
    const pending = getPendingEmail();
    if (pending) return { status: 'loading' as const, error: null };
    return { status: 'needs_email' as const, error: null };
  }, [getPendingEmail, isEmailLink]);

  const [{ status, error }, setView] = useState(initialView);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (status !== 'loading') return;
    const href = window.location.href;
    const pending = getPendingEmail();
    if (!pending) return;

    void (async () => {
      try {
        await completeEmailLinkSignIn(pending, href);
        router.replace(nextPath);
      } catch (e: unknown) {
        setView({ status: 'error', error: e instanceof Error ? e.message : 'Failed to sign in.' });
      }
    })();
  }, [status, completeEmailLinkSignIn, getPendingEmail, router, nextPath]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-sm text-red-400">{error || 'Something went wrong.'}</div>
      </div>
    );
  }

  if (status === 'needs_email') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 px-8 py-8">
          <div className="text-center text-2xl font-semibold">Confirm your email</div>
          <p className="mt-2 text-center text-sm text-white/60">
            Enter the email you used to request the sign-in link.
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-full border border-white/15 bg-black/30 px-5 py-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email address"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
              />
            </div>
            <button
              type="button"
              disabled={!email}
              onClick={async () => {
                setView({ status: 'loading', error: null });
                try {
                  await completeEmailLinkSignIn(email, window.location.href);
                  router.replace(nextPath);
                } catch (e: unknown) {
                  setView({ status: 'needs_email', error: e instanceof Error ? e.message : 'Failed to sign in.' });
                }
              }}
              className="w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
            {error ? <div className="text-xs text-red-400 text-center">{error}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-sm text-white/60">Signing you in…</div>
    </div>
  );
}
