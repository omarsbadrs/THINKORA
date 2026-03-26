/**
 * @thinkora/auth — Authentication utilities for Thinkora.
 *
 * Re-exports everything from the three sub-modules so consumers can
 * cherry-pick or import from the top level:
 *
 * ```ts
 * import { useAuth, createServerSupabaseClient, AuthGuard } from '@thinkora/auth';
 * ```
 */

export {
  createServerSupabaseClient,
  getServerSession,
  getServerUser,
  requireAuth,
  type CookieStore,
} from './server';

export {
  createBrowserSupabaseClient,
  useAuth,
  type UseAuthReturn,
} from './client';

export {
  isAuthenticated,
  isAdmin,
  requireRole,
  AuthGuard,
  type AuthGuardOptions,
} from './guards';
