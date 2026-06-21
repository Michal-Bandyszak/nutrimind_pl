import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';
import { fetchPlanWithMeals } from '@/lib/services/MealPlanGenerator';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; mealId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId, mealId } = await params;
    await requireOwnedPlan(planId, context.householdId);
    const body = await req.json() as { participantId?: string; servings?: number };
    const servings = Math.round(Number(body.servings) * 4) / 4;
    if (!body.participantId || !Number.isFinite(servings) || servings < 0.25 || servings > 4) {
      return NextResponse.json({ error: 'Porcja musi mieścić się w zakresie 0,25–4.' }, { status: 400 });
    }

    const meal = await prisma.mealPlanMeal.findFirst({
      where: { id: mealId, mealPlanId: planId },
    });
    if (!meal) return NextResponse.json({ error: 'Posiłek nie istnieje.' }, { status: 404 });

    const participant = await prisma.mealPlanParticipant.findFirst({
      where: { id: body.participantId, mealPlanId: planId },
    });
    if (!participant) throw new Error('FORBIDDEN');

    const affectedMeals = meal.batchGroupId
      ? await prisma.mealPlanMeal.findMany({
          where: {
            mealPlanId: planId,
            mealType: meal.mealType,
            batchGroupId: meal.batchGroupId,
          },
          select: { id: true },
        })
      : [{ id: meal.id }];

    await prisma.$transaction(async (tx) => {
      for (const affected of affectedMeals) {
        await tx.mealPlanMealPortion.update({
          where: {
            mealPlanMealId_participantId: {
              mealPlanMealId: affected.id,
              participantId: participant.id,
            },
          },
          data: { servings },
        });
        const portions = await tx.mealPlanMealPortion.findMany({
          where: { mealPlanMealId: affected.id },
          select: { servings: true },
        });
        await tx.mealPlanMeal.update({
          where: { id: affected.id },
          data: { servings: portions.reduce((sum, portion) => sum + portion.servings, 0) },
        });
      }
    });

    return NextResponse.json({
      data: await fetchPlanWithMeals(planId, context.householdId),
    });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
