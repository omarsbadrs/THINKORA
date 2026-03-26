/**
 * Server-side Supabase auth utilities for Next.js App Router.
 *
 * Every function accepts a `cookieStore` (from `next/headers`) so it can be
 * called from server components, server actions, and route handlers.
 *
 * When SUPABASE_URL / SUPABASE_ANON_KEY are not configured the helpers fall
 * back to "demo mode" — returning a mock user and never hitting Supabase.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Demo-mode fallback
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
// Cookie-store type
// ---------------------------------------------------------------------------

/**
 * Minimal cookie-store interface compatible with `cookies()` from next/headers.
 */
export interface CookieStore {
  get(name: string): { name: string; value: string } | undefined;
  set(options: { name: string; value: string } & CookieOptions): void;
  delete(name: string): void;
}

// ---------------------------------------------------------------------------
// Core client factory
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client wired to the request's cookie jar. Use this from
 * any server component, server action, or route handler.
 *
 * ```ts
 * import { cookies } from 'next/headers';
 * const supabase = createServerSupabaseClient(await cookies());
 * ```
 */
export function createServerSupabaseClient(
  cookieStore: CookieStore,
): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // `set` throws when called from a Server Component (read-only).
          // Swallow the error — the cookie will be set by middleware instead.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name);
        } catch {
          // Same as above — read-only context.
        }
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Session / user helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current Supabase session, or `null` when unauthenticated.
 */
export async function getServerSession(
  cookieStore: CookieStore,
): Promise<Session | null> {
  if (isDemoMode()) return DEMO_SESSION;

  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Returns the authenticated user, or `null`.
 */
export async function getServerUser(
  cookieStore: CookieStore,
): Promise<User | null> {
  if (isDemoMode()) return DEMO_USER;

  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Verifies the user is authenticated and returns the `User` object.
 * Throws an error when the request is unauthenticated so you can handle it
 * with a try/catch or let it bubble up to an error boundary.
 */
export async function requireAuth(cookieStore: CookieStore): Promise<User> {
  const user = await getServerUser(cookieStore);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
