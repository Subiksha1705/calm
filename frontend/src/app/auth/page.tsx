'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  if (!('code' in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function getFriendlyAuthErrorMessage(error: unknown, fallback: string): string | null {
  const code = getErrorCode(error);

  // User intentionally cancelled the popup; don't show an error.
  if (code === 'auth/popup-closed-by-user') return null;

  // Quota / rate-limit type errors.
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
    return 'Daily limit reached. Try again tomorrow.';
  }

  if (code === 'auth/popup-blocked') return 'Popup blocked. Please allow popups and try again.';
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorized for Google sign-in.';

  return fallback;
}

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, signInWithGoogle, sendEmailLink } = useAuth();

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/chat';
    try {
      return new URLSearchParams(window.location.search).get('next') || '/chat';
    } catch {
      return '/chat';
    }
  }, []);

  const mode = useMemo<'login' | 'signup'>(() => {
    if (typeof window === 'undefined') return 'login';
    try {
      const m = new URLSearchParams(window.location.search).get('mode');
      return m === 'signup' ? 'signup' : 'login';
    } catch {
      return 'login';
    }
  }, []);

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldownS, setCooldownS] = useState(0);

  const title = useMemo(() => (mode === 'signup' ? 'Log in or sign up' : 'Log in or sign up'), [mode]);

  useEffect(() => {
    if (isLoading) return;
    if (user) router.replace(nextPath);
  }, [user, isLoading, router, nextPath]);

  useEffect(() => {
    // Reset "sent" state when user edits the email.
    if (sent) setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    if (cooldownS <= 0) return;
    const t = window.setInterval(() => {
      setCooldownS((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownS]);

  const canSendEmail = Boolean(email) && !busy && cooldownS === 0;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <Link href="/" className="absolute left-8 top-8 text-sm font-semibold text-white/80 hover:text-white">
        Calm Sphere
      </Link>

      <button
        type="button"
        onClick={() => router.push('/')}
        aria-label="Close"
        className="absolute right-6 top-6 rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <span className="text-xl leading-none">×</span>
      </button>

      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 px-8 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="text-center text-3xl font-semibold tracking-tight">{title}</div>
        <p className="mt-3 text-center text-sm text-white/60">
          You’ll get smarter responses and can upload files, images, and more.
        </p>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                await signInWithGoogle();
                router.replace(nextPath);
              } catch (e: unknown) {
                const message = getFriendlyAuthErrorMessage(e, e instanceof Error ? e.message : 'Google sign-in failed');
                if (message) setError(message);
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <span className="text-base">G</span>
            Continue with Google
          </button>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-xs text-white/40">OR</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="mt-6 space-y-3">
          <div
            className={[
              'rounded-full bg-black/30 px-5 py-3 border',
              sent ? 'border-emerald-400/60' : 'border-white/15',
            ].join(' ')}
          >
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
            disabled={!canSendEmail}
            onClick={async () => {
              setError(null);
              setSent(false);
              setBusy(true);
              try {
                await sendEmailLink(email, nextPath);
                setSent(true);
                setCooldownS(60);
              } catch (e: unknown) {
                const message = getFriendlyAuthErrorMessage(
                  e,
                  e instanceof Error ? e.message : 'Failed to send sign-in link'
                );
                if (message) setError(message);
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {cooldownS > 0 ? `Resend in ${cooldownS}s` : 'Continue'}
          </button>

          {sent ? (
            <div className="text-xs text-white/60 text-center">
              Email is sent. Check your inbox for a sign-in link.
            </div>
          ) : (
            <div className="text-xs text-white/60 text-center">We’ll email you a sign-in link.</div>
          )}
        </div>

        {error ? <div className="mt-5 text-xs text-red-400 text-center">{error}</div> : null}

        <div className="mt-8 text-center text-xs text-white/40">
          By continuing, you agree to our Terms of Use and have read our Privacy Policy.
        </div>
      </div>
    </div>
  );
}
