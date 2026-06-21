import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isPublic = pathname === '/login' || pathname.startsWith('/api/auth/');
  if (isPublic) return NextResponse.next();

  if (!getSessionCookie(req)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)'],
};
