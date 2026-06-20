import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function unauthorized(realm = 'NutriMind') {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

function misconfigured() {
  return new NextResponse('Basic auth is not configured for production.', {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function readCredentials(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(header.slice(6));
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!username || !password) {
    return isProduction ? misconfigured() : NextResponse.next();
  }

  const credentials = readCredentials(req);
  if (!credentials) return unauthorized();

  if (credentials.username !== username || credentials.password !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
