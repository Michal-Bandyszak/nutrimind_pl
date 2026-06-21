import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export type AuthContext = {
  userId: string;
  email: string;
  householdId: string;
  primaryProfileId: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: {
      household: {
        include: {
          profiles: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });
  const primary = membership?.household.profiles[0];
  if (!membership || !primary) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    householdId: membership.householdId,
    primaryProfileId: primary.id,
  };
}

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect('/login');
  return context;
}

export async function requireApiContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) throw new Error('UNAUTHORIZED');
  return context;
}

export function apiError(error: unknown, fallback = 'Błąd serwera.') {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { message: 'Brak autoryzacji.', status: 401 };
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return { message: 'Brak dostępu.', status: 403 };
  }
  return {
    message: error instanceof Error ? error.message : fallback,
    status: 500,
  };
}
