import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/otp',
  '/auth/reset-password',
  '/auth/2fa',
  '/auth/session-expired',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession = request.cookies.get('hg_auth')?.value === '1';

  if (pathname === '/') {
    return NextResponse.next();
  }

  if (!isPublic && pathname.startsWith('/rm') && !hasSession) {
    const login = new URL('/auth/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
