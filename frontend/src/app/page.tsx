'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace('/chat');
    }
  }, [user, isLoading, router]);

  const nextParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return new URLSearchParams(window.location.search).get('next');
    } catch {
      return null;
    }
  }, []);

  const { loginHref, signupHref } = useMemo(() => {
    const next = nextParam;
    return {
      loginHref: next ? `/auth?mode=login&next=${encodeURIComponent(next)}` : '/auth?mode=login',
      signupHref: next ? `/auth?mode=signup&next=${encodeURIComponent(next)}` : '/auth?mode=signup',
    };
  }, [nextParam]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">Calm Sphere</div>
          <div className="flex items-center gap-3">
            <Link
              href={loginHref}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Log in
            </Link>
            <Link
              href={signupHref}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Sign up for free
            </Link>
          </div>
        </header>

        <main className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <section className="min-h-[380px] flex items-center">
            <div>
              <div className="text-sm font-medium text-white/60">Calm Sphere</div>
              <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
                Find calm and clarity
                <span className="block text-white/60">one conversation at a time.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base text-white/60">
                A supportive space to reflect, unwind, and organize your thoughts.
              </p>
            </div>
          </section>

          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-8">
              <div className="text-2xl font-semibold">Get started</div>
              <div className="mt-6 space-y-3">
                <Link
                  href={loginHref}
                  className="block w-full rounded-full bg-[#0B5FFF] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#0B5FFF]/90 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href={signupHref}
                  className="block w-full rounded-full bg-[#0B5FFF] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#0B5FFF]/90 transition-colors"
                >
                  Sign up for free
                </Link>
              </div>
              <div className="mt-6 text-center text-xs text-white/50">Try it first</div>
            </div>
          </section>
        </main>

        <footer className="mt-20 flex items-center justify-end gap-4 text-xs text-white/40">
          <span>Terms of use</span>
          <span>|</span>
          <span>Privacy policy</span>
        </footer>
      </div>
    </div>
  );
}
