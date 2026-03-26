/**
 * Client-side Supabase auth utilities and React hook.
 *
 * Provides a singleton browser client and a `useAuth()` hook that keeps track
 * of the current user, session, and loading state while exposing helpers for
 * sign-in, sign-up, sign-out, and password reset.
 *
 * When NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing
 * the module operates in "demo mode" with a mock user.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Demo-mode helpers
// ---------------------------------------------------------------------------

const DEMO_USER: User = {
  id: 'demo-user-000',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@thinkora.dev',
  role: 'authenticated',
} as User;

const DEMO_SESSION: Session = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: DEMO_USER,
};

function isDemoMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ---------------------------------------------------------------------------
// Browser client singleton
// ---------------------------------------------------------------------------

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for the browser. Returns `null` when
 * credentials are missing (demo mode).
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (isDemoMode()) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}

// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

/**
 * React hook that manages auth state and exposes action helpers.
 *
 * ```tsx
 * const { user, isLoading, signIn, signOut } = useAuth();
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialised = useRef(false);

  // ---- Bootstrap session on mount -------------------------------------------
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    if (isDemoMode()) {
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient()!;

    // Fetch the current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ---- Actions --------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (isDemoMode()) {
        setUser(DEMO_USER);
        setSession(DEMO_SESSION);
        return { error: null };
      }

      const supabase = createBrowserSupabaseClient()!;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
    ): Promise<{ error: string | null }> => {
      if (isDemoMode()) {
        setUser(DEMO_USER);
        setSession(DEMO_SESSION);
        return { error: null };
      }

      const supabase = createBrowserSupabaseClient()!;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (isDemoMode()) {
      setUser(null);
      setSession(null);
      return;
    }

    const supabase = createBrowserSupabaseClient()!;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (isDemoMode()) {
        return { error: null };
      }

      const supabase = createBrowserSupabaseClient()!;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  return { user, session, isLoading, signIn, signUp, signOut, resetPassword };
}
