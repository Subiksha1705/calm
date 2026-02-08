'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  onIdTokenChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { setAuthToken } from '@/lib/authToken';

const PENDING_EMAIL_KEY = 'calm_sphere_pending_email';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  sendEmailLink: (email: string, nextPath?: string) => Promise<void>;
  completeEmailLinkSignIn: (email: string, href: string) => Promise<void>;
  isEmailLink: (href: string) => boolean;
  getPendingEmail: () => string | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserDoc(u: User) {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  const basePayload = {
    uid: u.uid,
    name: u.displayName || null,
    email: u.email || null,
    createdAt: snap.exists() ? undefined : serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };
  // Only include defined fields so we don't overwrite createdAt on subsequent logins.
  const payload = Object.fromEntries(Object.entries(basePayload).filter(([, v]) => v !== undefined));
  await setDoc(ref, payload, { merge: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setIsLoading(false);
      if (!u) {
        setAuthToken(null);
        return;
      }
      try {
        const idToken = await u.getIdToken();
        setAuthToken(idToken);
        await ensureUserDoc(u);
      } catch {
        setAuthToken(null);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const res = await signInWithPopup(auth, googleProvider);
    const u = res.user;
    const idToken = await u.getIdToken();
    // STEP 5 success check
    console.log(u.uid, u.email, u.displayName);
    setAuthToken(idToken);
  }, []);

  const sendEmailLink = useCallback(async (email: string, nextPath?: string) => {
    const url = `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`;
    await sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
    window.localStorage.setItem(PENDING_EMAIL_KEY, email);
  }, []);

  const completeEmailLinkSignIn = useCallback(async (email: string, href: string) => {
    const res = await signInWithEmailLink(auth, email, href);
    window.localStorage.removeItem(PENDING_EMAIL_KEY);
    const idToken = await res.user.getIdToken();
    setAuthToken(idToken);
    await ensureUserDoc(res.user);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setAuthToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signInWithGoogle,
      sendEmailLink,
      completeEmailLinkSignIn,
      isEmailLink: (href) => isSignInWithEmailLink(auth, href),
      getPendingEmail: () => {
        try {
          return window.localStorage.getItem(PENDING_EMAIL_KEY);
        } catch {
          return null;
        }
      },
      logout,
    }),
    [user, isLoading, signInWithGoogle, sendEmailLink, completeEmailLinkSignIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
