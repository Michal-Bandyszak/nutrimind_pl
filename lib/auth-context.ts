import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export type AuthContext = {
  userId: string;
  email: string;
  householdId: string;
  personProfileId: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    select: {
      householdId: true,
      household: {
        select: {
          profiles: {
            where: { userId: session.user.id },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
  const profile = membership?.household.profiles[0];
  if (!membership || !profile) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    householdId: membership.householdId,
    personProfileId: profile.id,
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
  if (error && typeof error === 'object' && 'code' in error
    && (error as { code?: unknown }).code === 'NO_ELIGIBLE_RECIPE') {
    const recipeError = error as unknown as Error & { mealType?: string; batchDays?: number };
    return {
      message: recipeError.message || 'Brak bezpiecznego przepisu dla wybranego bloku.',
      status: 400,
      code: 'NO_ELIGIBLE_RECIPE',
      mealType: recipeError.mealType,
      batchDays: recipeError.batchDays,
    };
  }
  console.error('[api] Internal request failure:', error);
  return {
    message: fallback,
    status: 500,
  };
}
