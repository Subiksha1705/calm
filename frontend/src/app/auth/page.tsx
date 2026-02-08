'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, signInWithGoogle, getSignInMethods, signUpWithEmailPassword, loginWithEmailPassword } =
    useAuth();

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

  const [step, setStep] = useState<'email' | 'login' | 'signup'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'signup' ? 'Log in or sign up' : 'Log in or sign up'), [mode]);

  useEffect(() => {
    if (isLoading) return;
    if (user) router.replace(nextPath);
  }, [user, isLoading, router, nextPath]);

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
                setError(e instanceof Error ? e.message : 'Google sign-in failed');
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-3"
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
          <div className="rounded-full border border-white/15 bg-black/30 px-5 py-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email address"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
            />
          </div>
          {step === 'email' ? (
            <button
              type="button"
              disabled={!email || busy}
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  const methods = await getSignInMethods(email);
                  if (methods.includes('password')) setStep('login');
                  else setStep('signup');
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : 'Something went wrong');
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          ) : null}

          {step === 'login' ? (
            <>
              <div className="rounded-full border border-white/15 bg-black/30 px-5 py-3">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Password"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                />
              </div>
              <button
                type="button"
                disabled={!password || busy}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await loginWithEmailPassword({ email, password });
                    router.replace(nextPath);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'Login failed');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPassword('');
                  setError(null);
                }}
                className="w-full rounded-full bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Back
              </button>
            </>
          ) : null}

          {step === 'signup' ? (
            <>
              <div className="rounded-full border border-white/15 bg-black/30 px-5 py-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  placeholder="Name"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                />
              </div>
              <div className="rounded-full border border-white/15 bg-black/30 px-5 py-3">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Password"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                />
              </div>
              <button
                type="button"
                disabled={!name || !password || busy}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await signUpWithEmailPassword({ email, password, name });
                    router.replace(nextPath);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'Sign up failed');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setName('');
                  setPassword('');
                  setError(null);
                }}
                className="w-full rounded-full bg-white/10 border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Back
              </button>
            </>
          ) : null}
        </div>

        {error ? <div className="mt-5 text-xs text-red-400 text-center">{error}</div> : null}

        <div className="mt-8 text-center text-xs text-white/40">
          By continuing, you agree to our Terms of Use and have read our Privacy Policy.
        </div>
      </div>
    </div>
  );
}
