import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { BatchConfig } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';

const REBATCH_MEAL_TYPES = [
  'breakfast',
  'second_breakfast',
  'lunch',
  'dinner',
  'cocktail',
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const { config } = (await req.json()) as { config: BatchConfig };

    for (const mealType of REBATCH_MEAL_TYPES) {
      const dividers = config[mealType];
      const groups = dividersToGroups(dividers); // e.g. [1,1,2,2,3,3,3]
      const uniqueGroups = [...new Set(groups)];

      const meals = await prisma.mealPlanMeal.findMany({
        where: { mealPlanId: planId, mealType },
        orderBy: { dayOfWeek: 'asc' },
      });
      if (meals.length === 0) continue;

      const mealsByDay = new Map(meals.map((m) => [m.dayOfWeek, m]));
      const usedRecipes = new Set<string>();

      // Fetch all recipes of this type once (for fallback on splits)
      const allRecipesOfType = await prisma.recipe.findMany({
        where: {
          type: mealType,
          nutritionVerified: true,
          ...(mealType === 'lunch' ? { batchFriendly: true } : {}),
        },
        select: { id: true, maxStorageDays: true },
        orderBy: [{ maxStorageDays: 'desc' }, { name: 'asc' }],
      });
      if (allRecipesOfType.length === 0) continue;

      const updates: ReturnType<typeof prisma.mealPlanMeal.update>[] = [];

      for (const group of uniqueGroups) {
        const daysInGroup = groups
          .map((g, idx) => (g === group ? idx + 1 : null))
          .filter((d): d is number => d !== null);

        const firstDay = daysInGroup[0];
        const firstMeal = firstDay ? mealsByDay.get(firstDay) : null;
        const preferredRecipeId = firstMeal?.recipeId ?? meals[0].recipeId;
        const requiredStorageDays = daysInGroup.length;

        // Prefer current recipe from the first day in group.
        // Keep the user's selected grouping intact; prefer recipes that can cover
        // the whole block instead of silently splitting it by maxStorageDays.
        const preferredRecipe = allRecipesOfType.find((r) => r.id === preferredRecipeId);
        const chosenRecipe =
          (preferredRecipe && preferredRecipe.maxStorageDays >= requiredStorageDays && !usedRecipes.has(preferredRecipe.id)
            ? preferredRecipe
            : null) ??
          allRecipesOfType.find((r) => r.maxStorageDays >= requiredStorageDays && !usedRecipes.has(r.id)) ??
          allRecipesOfType.find((r) => r.maxStorageDays >= requiredStorageDays) ??
          (preferredRecipe && !usedRecipes.has(preferredRecipe.id) ? preferredRecipe : null) ??
          allRecipesOfType.find((r) => !usedRecipes.has(r.id)) ??
          preferredRecipe ??
          allRecipesOfType[0];

        usedRecipes.add(chosenRecipe.id);

        const batchGroupId = crypto.randomUUID();
        daysInGroup.forEach((dayOfWeek, idxInGroup) => {
          const meal = mealsByDay.get(dayOfWeek);
          if (!meal) return;
          updates.push(
            prisma.mealPlanMeal.update({
              where: { id: meal.id },
              data: {
                recipeId: chosenRecipe.id,
                batchGroupId,
                batchDayNum: idxInGroup + 1,
              },
            }),
          );
        });
      }

      if (updates.length) {
        await prisma.$transaction(updates);
      }
    }

    // Return the updated full plan
    const updated = await prisma.mealPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        meals: {
          include: {
            recipe: {
              include: { ingredients: { include: { ingredient: true } } },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
