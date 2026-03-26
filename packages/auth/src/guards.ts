/**
 * Route protection utilities for API routes and middleware.
 *
 * These helpers inspect the incoming `Request` for a valid Supabase session
 * and provide role-based access control.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Demo-mode helpers
// ---------------------------------------------------------------------------

const DEMO_USER: User = {
  id: 'demo-user-000',
  app_metadata: { role: 'admin' },
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@thinkora.dev',
  role: 'authenticated',
} as User;

function isDemoMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ---------------------------------------------------------------------------
// Internal: extract user from request cookies
// ---------------------------------------------------------------------------

async function getUserFromRequest(request: Request): Promise<User | null> {
  if (isDemoMode()) return DEMO_USER;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Build a cookie map from the request
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = new Map<string, string>();
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies.set(name, rest.join('='));
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookies.get(name);
      },
      set(_name: string, _value: string, _options: CookieOptions) {
        // Read-only — we never set cookies in guard checks
      },
      remove(_name: string, _options: CookieOptions) {
        // Read-only
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ---------------------------------------------------------------------------
// Public guard helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the request carries a valid Supabase session.
 */
export async function isAuthenticated(request: Request): Promise<boolean> {
  const user = await getUserFromRequest(request);
  return user !== null;
}

/**
 * Returns `true` when the authenticated user has an `admin` role in
 * `app_metadata`.
 */
export async function isAdmin(request: Request): Promise<boolean> {
  const user = await getUserFromRequest(request);
  if (!user) return false;
  return user.app_metadata?.role === 'admin';
}

/**
 * Throws if the authenticated user does not have the specified role.
 * Returns the `User` object on success.
 */
export async function requireRole(
  request: Request,
  role: string,
): Promise<User> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  if (user.app_metadata?.role !== role) {
    throw new Error(`Role "${role}" required`);
  }
  return user;
}

// ---------------------------------------------------------------------------
// AuthGuard middleware factory
// ---------------------------------------------------------------------------

type NextHandler = (request: Request) => Promise<Response> | Response;

export interface AuthGuardOptions {
  /** Required role. When omitted any authenticated user is allowed. */
  role?: string;
  /** Custom response when authentication fails (default: 401 JSON). */
  onUnauthenticated?: (request: Request) => Response;
  /** Custom response when authorisation fails (default: 403 JSON). */
  onUnauthorised?: (request: Request) => Response;
}

/**
 * Higher-order function that wraps an API route handler with auth checks.
 *
 * ```ts
 * export const GET = AuthGuard({ role: 'admin' })(async (request) => {
 *   return Response.json({ ok: true });
 * });
 * ```
 */
export function AuthGuard(options: AuthGuardOptions = {}) {
  return (handler: NextHandler): NextHandler => {
    return async (request: Request): Promise<Response> => {
      const user = await getUserFromRequest(request);

      if (!user) {
        if (options.onUnauthenticated) {
          return options.onUnauthenticated(request);
        }
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (options.role && user.app_metadata?.role !== options.role) {
        if (options.onUnauthorised) {
          return options.onUnauthorised(request);
        }
        return new Response(
          JSON.stringify({ error: `Role "${options.role}" required` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return handler(request);
    };
  };
}
