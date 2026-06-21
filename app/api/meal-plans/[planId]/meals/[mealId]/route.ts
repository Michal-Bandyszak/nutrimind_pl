import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; mealId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId, mealId } = await params;
    await requireOwnedPlan(planId, context.householdId);

    const meal = await prisma.mealPlanMeal.findFirst({
      where: { id: mealId, mealPlanId: planId },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Posiłek nie znaleziony.' }, { status: 404 });
    }

    if (meal.mealType !== 'snack') {
      return NextResponse.json(
        { error: 'Można usuwać tylko przekąski.' },
        { status: 403 },
      );
    }

    await prisma.mealPlanMeal.delete({ where: { id: mealId } });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
