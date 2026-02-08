'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { setAuthToken } from '@/lib/authToken';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  getSignInMethods: (email: string) => Promise<string[]>;
  signUpWithEmailPassword: (args: { email: string; password: string; name?: string }) => Promise<void>;
  loginWithEmailPassword: (args: { email: string; password: string }) => Promise<void>;
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

  const getSignInMethods = useCallback(async (email: string) => {
    return fetchSignInMethodsForEmail(auth, email);
  }, []);

  const signUpWithEmailPassword = useCallback(async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(res.user, { displayName: name });
    }
    const idToken = await res.user.getIdToken();
    setAuthToken(idToken);
    await ensureUserDoc(res.user);
  }, []);

  const loginWithEmailPassword = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
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
      getSignInMethods,
      signUpWithEmailPassword,
      loginWithEmailPassword,
      logout,
    }),
    [user, isLoading, signInWithGoogle, getSignInMethods, signUpWithEmailPassword, loginWithEmailPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
