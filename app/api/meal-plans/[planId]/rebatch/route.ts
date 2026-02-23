import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { BatchConfig } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const { config } = (await req.json()) as { config: BatchConfig };

    for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
      const dividers = config[mealType];
      const groups = dividersToGroups(dividers); // e.g. [1,1,2,2,3,3,3]
      const uniqueGroups = [...new Set(groups)];

      const meals = await prisma.mealPlanMeal.findMany({
        where: { mealPlanId: planId, mealType },
        orderBy: { dayOfWeek: 'asc' },
      });
      if (meals.length === 0) continue;

      // ── Determine recipe for each new group ──────────────────────────────
      // Rule: use the recipe from the first day in each group.
      // If two groups would get the same recipe (group split), pick a
      // different recipe from the DB for the second group.
      const groupRecipe: Record<number, string> = {};
      const groupBatchId: Record<number, string> = {};
      const usedRecipes = new Set<string>();

      // Fetch all recipes of this type once (for fallback on splits)
      const allRecipesOfType = await prisma.recipe.findMany({
        where: { type: mealType },
        orderBy: { name: 'asc' },
      });

      for (const g of uniqueGroups) {
        groupBatchId[g] = crypto.randomUUID();

        const firstDayIdx = groups.findIndex((grp) => grp === g);
        const firstMeal = meals[firstDayIdx];
        const candidateRecipeId = firstMeal?.recipeId ?? meals[0].recipeId;

        if (!usedRecipes.has(candidateRecipeId)) {
          // Unchanged or merged group → keep recipe
          groupRecipe[g] = candidateRecipeId;
        } else {
          // Split-off piece → pick a different recipe from DB
          const alternative = allRecipesOfType.find((r) => !usedRecipes.has(r.id));
          groupRecipe[g] = alternative?.id ?? candidateRecipeId; // fallback: allow repeat
        }
        usedRecipes.add(groupRecipe[g]);
      }

      // ── Update meals in DB ───────────────────────────────────────────────
      for (let i = 0; i < meals.length; i++) {
        const group = groups[i];
        const batchDayNum = groups.slice(0, i).filter((g) => g === group).length + 1;

        await prisma.mealPlanMeal.update({
          where: { id: meals[i].id },
          data: {
            recipeId: groupRecipe[group],
            batchGroupId: groupBatchId[group],
            batchDayNum,
          },
        });
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
