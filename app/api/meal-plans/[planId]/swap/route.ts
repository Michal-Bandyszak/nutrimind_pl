import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { validateRecipeForMealSlot } from '@/lib/utils/mealPlanGuards';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';

async function countBatchDays(
  planId: string,
  meal: { mealType: string; batchGroupId: string | null },
) {
  if (!meal.batchGroupId) return 1;
  return prisma.mealPlanMeal.count({
    where: {
      mealPlanId: planId,
      mealType: meal.mealType,
      batchGroupId: meal.batchGroupId,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId } = await params;
    await requireOwnedPlan(planId, context.householdId);
    const body = await req.json() as {
      sourceDayOfWeek: number;
      targetDayOfWeek: number;
      // Cross-type support: sourceMealType/targetMealType are preferred;
      // legacy mealType (same for both) kept for backward compat
      sourceMealType?: string;
      targetMealType?: string;
      mealType?: string;
    };
    const { sourceDayOfWeek, targetDayOfWeek } = body;
    const srcMealType = body.sourceMealType ?? body.mealType ?? '';
    const tgtMealType = body.targetMealType ?? body.mealType ?? '';

    if (sourceDayOfWeek === targetDayOfWeek && srcMealType === tgtMealType) {
      return NextResponse.json({ data: null });
    }

    const [sourceMeal, targetMeal] = await Promise.all([
      prisma.mealPlanMeal.findFirst({
        where: { mealPlanId: planId, dayOfWeek: sourceDayOfWeek, mealType: srcMealType },
        include: {
          recipe: {
            select: {
              role: true,
              type: true,
              nutritionVerified: true,
              maxStorageDays: true,
              kcalPerServing: true,
              batchFriendly: true,
            },
          },
        },
      }),
      prisma.mealPlanMeal.findFirst({
        where: { mealPlanId: planId, dayOfWeek: targetDayOfWeek, mealType: tgtMealType },
        include: {
          recipe: {
            select: {
              role: true,
              type: true,
              nutritionVerified: true,
              maxStorageDays: true,
              kcalPerServing: true,
              batchFriendly: true,
            },
          },
        },
      }),
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

    const [sourceBatchDays, targetBatchDays] = await Promise.all([
      countBatchDays(planId, sourceMeal),
      countBatchDays(planId, targetMeal),
    ]);

    const targetSlotError = validateRecipeForMealSlot({
      recipe: sourceMeal.recipe,
      mealType: targetMeal.mealType,
      batchDays: targetBatchDays,
      currentKcalPerServing: targetMeal.recipe.kcalPerServing,
    });
    if (targetSlotError) {
      return NextResponse.json({ error: targetSlotError }, { status: 400 });
    }

    const sourceSlotError = validateRecipeForMealSlot({
      recipe: targetMeal.recipe,
      mealType: sourceMeal.mealType,
      batchDays: sourceBatchDays,
      currentKcalPerServing: sourceMeal.recipe.kcalPerServing,
    });
    if (sourceSlotError) {
      return NextResponse.json({ error: sourceSlotError }, { status: 400 });
    }

    // Swap recipes across entire batch groups (or single meals if no batch group).
    // Two separate updates inside a transaction — they filter by different batchGroupId
    // values so they cannot overlap (source ≠ target, verified above).
    await prisma.$transaction([
      // Source batch group → gets target's recipe
      prisma.mealPlanMeal.updateMany({
        where: {
          mealPlanId: planId,
          mealType: srcMealType,
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
          mealType: tgtMealType,
          ...(targetMeal.batchGroupId
            ? { batchGroupId: targetMeal.batchGroupId }
            : { dayOfWeek: targetDayOfWeek }),
        },
        data: { recipeId: sourceRecipeId },
      }),
    ]);

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
