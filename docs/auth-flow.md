# Authentication Flow

Thinkora uses [Supabase Auth](https://supabase.com/docs/guides/auth) for authentication, with cookie-based session management via `@supabase/ssr`. The `@thinkora/auth` package provides server-side helpers, client-side utilities, and route guard middleware.

## Supabase Auth Overview

Supabase Auth is a JWT-based authentication service built on GoTrue. It supports:
- Email/password authentication
- Magic links
- OAuth providers (Google, GitHub, etc.)
- Row-Level Security (RLS) integration via `auth.uid()`
- JWT tokens stored in HTTP-only cookies

Thinkora uses the `@supabase/ssr` package to handle cookie-based sessions in Next.js server components, server actions, and API route handlers.

## Sign Up Flow

```
User fills out sign-up form (/signup)
        |
        v
  SignupForm component calls supabase.auth.signUp({
    email, password,
    options: { data: { full_name } }
  })
        |
        v
  Supabase Auth creates user in auth.users table
  Sends confirmation email (if email confirmation enabled)
        |
        v
  On confirmation, user is redirected to /login
        |
        v
  A trigger creates a row in users_profile table
  (id references auth.users.id)
```

## Sign In Flow

```
User fills out login form (/login)
        |
        v
  LoginForm component calls supabase.auth.signInWithPassword({
    email, password
  })
        |
        v
  Supabase Auth validates credentials
  Returns session with access_token and refresh_token
        |
        v
  @supabase/ssr stores tokens in HTTP-only cookies
  (sb-<project-ref>-auth-token)
        |
        v
  User is redirected to /chat
        |
        v
  Next.js middleware (middleware.ts) checks session on every request
  If no valid session -> redirect to /login
  If valid session -> allow access
```

## Password Reset Flow

```
User clicks "Forgot Password" (/forgot-password)
        |
        v
  ForgotPasswordForm calls supabase.auth.resetPasswordForEmail(email, {
    redirectTo: '/reset-password'
  })
        |
        v
  Supabase Auth sends reset email with magic link
        |
        v
  User clicks link -> arrives at /reset-password with token in URL
        |
        v
  ResetPasswordForm calls supabase.auth.updateUser({
    password: newPassword
  })
        |
        v
  Password updated, user redirected to /login
```

## Session Management

### Server-Side Session Access

The `@thinkora/auth` package provides these server-side helpers:

```typescript
import { cookies } from 'next/headers';
import {
  createServerSupabaseClient,
  getServerSession,
  getServerUser,
  requireAuth,
} from '@thinkora/auth';

// In a server component or route handler:
const cookieStore = await cookies();

// Get the Supabase client (wired to request cookies)
const supabase = createServerSupabaseClient(cookieStore);

// Get the current session (or null)
const session = await getServerSession(cookieStore);

// Get the current user (or null)
const user = await getServerUser(cookieStore);

// Require authentication (throws if not authenticated)
const user = await requireAuth(cookieStore);
```

### Route Protection (Middleware)

The Next.js middleware (`apps/web/middleware.ts`) runs on every request and:
1. Checks for a valid Supabase session in cookies
2. Redirects unauthenticated users to `/login` for protected routes
3. Redirects authenticated users away from `/login` and `/signup`

### API Route Guards

The `@thinkora/auth` package provides an `AuthGuard` higher-order function for API routes:

```typescript
import { AuthGuard } from '@thinkora/auth';

// Require any authenticated user
export const GET = AuthGuard()(async (request) => {
  return Response.json({ ok: true });
});

// Require admin role
export const POST = AuthGuard({ role: 'admin' })(async (request) => {
  return Response.json({ ok: true });
});
```

Guard helpers available:
- `isAuthenticated(request)` -- returns `boolean`
- `isAdmin(request)` -- checks `app_metadata.role === 'admin'`
- `requireRole(request, role)` -- throws if user lacks the specified role

### API Service Auth (Fastify)

The API service (`apps/api`) has an auth plugin (`src/plugins/auth.ts`) that:
1. Extracts the `Authorization` header or session cookie
2. Verifies the JWT with Supabase
3. Attaches the user to the request context
4. In demo mode, injects a mock demo user for all requests

## RLS Integration

Supabase Row-Level Security ensures data isolation at the database level. Every user-scoped table has RLS policies that use `auth.uid()` to restrict access.

### How it works

1. When a Supabase client is created with the **anon key**, all queries pass through RLS
2. The JWT in the request cookies contains the user's `sub` claim (their `auth.uid()`)
3. PostgreSQL policies like `USING (user_id = auth.uid())` ensure users can only see their own data
4. Nested data (messages via conversations, chunks via files) uses `EXISTS` subqueries to validate ownership

### RLS Policy Summary

| Table | Access Pattern |
|---|---|
| `users_profile` | Own profile only |
| `workspaces` | Owner or member |
| `conversations` | Own conversations only |
| `messages` | Via conversation ownership |
| `message_citations` | Via message -> conversation ownership |
| `files` | Own files only |
| `chunks` | Via file ownership |
| `connector_accounts` | Own connectors only |
| `memory_entries` | Own entries only |
| `saved_prompts` | Own prompts only |
| `audit_logs` | Insert: any authenticated; Read: admin only |
| `model_registry` | Read: any authenticated user |
| `model_usage_logs` | Own usage logs only |

### Service Role Key

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. It is used only:
- Server-side in the API service for admin operations
- In the worker for background job processing
- Never exposed to the client

## Demo Mode Auth Bypass

When Supabase credentials are missing (`NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set), the auth system operates in demo mode:

### Server-side behavior
- `getServerSession()` returns a mock `DEMO_SESSION` with a fake access token
- `getServerUser()` returns a `DEMO_USER` with:
  - `id: 'demo-user-000'`
  - `email: 'demo@thinkora.dev'`
  - `role: 'authenticated'`
  - `app_metadata.role: 'admin'` (full access in demo)
- `requireAuth()` always succeeds
- `isAuthenticated()` always returns `true`
- `isAdmin()` always returns `true`

### API-side behavior
- The auth plugin injects the demo user from config:
  - `id: 'demo-user-001'`
  - `name: 'Demo User'`
  - `email: 'demo@thinkora.dev'`
- All routes treat the request as authenticated

### Important notes
- Demo mode is for evaluation and development only
- No real authentication occurs; all data is accessible
- RLS is not enforced since the service role key or mock tokens are used
- Never run demo mode in production with real data
