import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/',
  '/_next/',
  '/favicon.ico',
];

const LOCALE_PREFIXES = ['en', 'fr', 'es'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public/static paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Redirect bare / to /en/dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}/dashboard`, request.url));
  }

  // Handle missing locale prefix — redirect /dashboard → /en/dashboard
  const hasLocale = LOCALE_PREFIXES.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  );

  if (!hasLocale && !pathname.startsWith('/guests')) {
    const locale =
      request.cookies.get('NEXT_LOCALE')?.value ?? DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // Auth check: protected routes need a token in the cookie or localStorage isn't accessible
  // in middleware — we rely on client-side redirect in the dashboard page for now,
  // but add a lightweight cookie-based check here for SSR protection.
  const token = request.cookies.get('accessToken')?.value;
  const isProtected =
    !PUBLIC_PATHS.some((p) => pathname.startsWith(p)) &&
    !pathname.includes('/(public)/');

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
