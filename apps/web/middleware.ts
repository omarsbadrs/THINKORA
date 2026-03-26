import { type NextRequest, NextResponse } from 'next/server';

/**
 * Auth middleware — protects /app/* routes.
 *
 * In production this will read the Supabase session cookie and redirect
 * unauthenticated users to /login. For now it operates in demo mode and
 * allows all traffic through.
 */

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes unconditionally
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // Demo mode: allow everything.
  // When auth is wired up, uncomment the block below.
  // ---------------------------------------------------------------------------
  // const sessionCookie =
  //   request.cookies.get('sb-access-token')?.value ??
  //   request.cookies.get('sb-refresh-token')?.value;
  //
  // if (!sessionCookie) {
  //   const loginUrl = request.nextUrl.clone();
  //   loginUrl.pathname = '/login';
  //   loginUrl.searchParams.set('redirect', pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (browser favicon)
     * - public assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)',
  ],
};
