import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const { sourceDayOfWeek, targetDayOfWeek, mealType } = await req.json() as {
      sourceDayOfWeek: number;
      targetDayOfWeek: number;
      mealType: string;
    };

    if (sourceDayOfWeek === targetDayOfWeek) {
      return NextResponse.json({ data: null });
    }

    const [sourceMeal, targetMeal] = await Promise.all([
      prisma.mealPlanMeal.findFirst({ where: { mealPlanId: planId, dayOfWeek: sourceDayOfWeek, mealType } }),
      prisma.mealPlanMeal.findFirst({ where: { mealPlanId: planId, dayOfWeek: targetDayOfWeek, mealType } }),
    ]);

    if (!sourceMeal || !targetMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Same batch group — both updateMany would target the same rows; second would
    // overwrite the first, leaving everything at sourceRecipeId. No-op instead.
    if (
      sourceMeal.batchGroupId &&
      targetMeal.batchGroupId &&
      sourceMeal.batchGroupId === targetMeal.batchGroupId
    ) {
      return NextResponse.json({ data: { ok: true } });
    }

    const sourceRecipeId = sourceMeal.recipeId;
    const targetRecipeId = targetMeal.recipeId;

    // No actual change needed when both groups already share the same recipe
    if (sourceRecipeId === targetRecipeId) {
      return NextResponse.json({ data: { ok: true } });
    }

    // Swap recipes across entire batch groups (or single meals if no batch group).
    // Two separate updates inside a transaction — they filter by different batchGroupId
    // values so they cannot overlap (source ≠ target, verified above).
    await prisma.$transaction([
      // Source batch group → gets target's recipe
      prisma.mealPlanMeal.updateMany({
        where: {
          mealPlanId: planId,
          mealType,
          ...(sourceMeal.batchGroupId
            ? { batchGroupId: sourceMeal.batchGroupId }
            : { dayOfWeek: sourceDayOfWeek }),
        },
        data: { recipeId: targetRecipeId },
      }),
      // Target batch group → gets source's recipe
      prisma.mealPlanMeal.updateMany({
        where: {
          mealPlanId: planId,
          mealType,
          ...(targetMeal.batchGroupId
            ? { batchGroupId: targetMeal.batchGroupId }
            : { dayOfWeek: targetDayOfWeek }),
        },
        data: { recipeId: sourceRecipeId },
      }),
    ]);

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
