import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { validateRecipeForMealSlot } from '@/lib/utils/mealPlanGuards';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId } = await params;
    await requireOwnedPlan(planId, context.householdId);
    const { mealId, dayOfWeek, mealType, newRecipeId } = await req.json() as {
      mealId?: string;
      dayOfWeek: number;
      mealType: string;
      newRecipeId: string;
    };

    if (!newRecipeId || (!mealId && (dayOfWeek == null || !mealType))) {
      return NextResponse.json({ error: 'Brakuje wymaganych pól.' }, { status: 400 });
    }

    const meal = await prisma.mealPlanMeal.findFirst({
      where: mealId
        ? { mealPlanId: planId, id: mealId }
        : { mealPlanId: planId, dayOfWeek, mealType },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Posiłek nie znaleziony.' }, { status: 404 });
    }

    const batchDays = meal.batchGroupId
      ? await prisma.mealPlanMeal.count({
          where: {
            mealPlanId: planId,
            mealType: meal.mealType,
            batchGroupId: meal.batchGroupId,
          },
        })
      : 1;

    const [newRecipe, currentRecipe] = await Promise.all([
      prisma.recipe.findUnique({
        where: { id: newRecipeId },
        select: {
          id: true,
          role: true,
          type: true,
          nutritionVerified: true,
          maxStorageDays: true,
          kcalPerServing: true,
          batchFriendly: true,
        },
      }),
      prisma.recipe.findUnique({
        where: { id: meal.recipeId },
        select: { kcalPerServing: true },
      }),
    ]);

    if (!newRecipe) {
      return NextResponse.json({ error: 'Przepis nie istnieje.' }, { status: 404 });
    }
    const visibleRecipe = await prisma.recipe.findFirst({
      where: {
        id: newRecipeId,
        OR: [{ householdId: null }, { householdId: context.householdId }],
      },
      select: { id: true },
    });
    if (!visibleRecipe) throw new Error('FORBIDDEN');

    const validationError = validateRecipeForMealSlot({
      recipe: newRecipe,
      mealType: meal.mealType,
      batchDays,
      currentKcalPerServing: currentRecipe?.kcalPerServing ?? null,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Replace across entire batch group (or single meal if no batch)
    await prisma.mealPlanMeal.updateMany({
      where: {
        mealPlanId: planId,
        mealType: meal.mealType,
        ...(meal.batchGroupId
          ? { batchGroupId: meal.batchGroupId }
          : { id: meal.id }),
      },
      data: { recipeId: newRecipeId },
    });

    return NextResponse.json({ data: { ok: true, batchGroupId: meal.batchGroupId } });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
