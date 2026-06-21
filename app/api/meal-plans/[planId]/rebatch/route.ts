import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { BatchConfig } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';
import {
  applyRecipeToDayContexts,
  applyRecipeToDayKcalTotals,
  buildCumulativeMealTargets,
  buildMealTargets,
  chooseRecipeForGroup,
  DEFAULT_TARGET_KCAL_PER_PERSON,
  type PlanDayContexts,
  type PlanDayKcalTotals,
  type RecipeCandidate,
} from '@/lib/utils/mealPlanScoring';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';

const REBATCH_MEAL_TYPES = [
  'breakfast',
  'second_breakfast',
  'lunch',
  'dinner',
  'cocktail',
] as const;

function normalizeCandidates(
  recipes: Array<{
    id: string;
    name: string;
    maxStorageDays: number;
    kcalPerServing: number | null;
    batchFriendly: boolean;
    tags: string;
    ingredients: { ingredient: { name: string } }[];
  }>,
): RecipeCandidate[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    maxStorageDays: recipe.maxStorageDays,
    kcalPerServing: recipe.kcalPerServing,
    batchFriendly: recipe.batchFriendly,
    tags: recipe.tags,
    ingredientNames: recipe.ingredients.map((item) => item.ingredient.name),
  }));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId } = await params;
    await requireOwnedPlan(planId, context.householdId);
    const { config } = (await req.json()) as { config: BatchConfig };
    const [planParticipants, planMealTypes, planMeals] = await Promise.all([
      prisma.mealPlanParticipant.findMany({
        where: { mealPlanId: planId },
        select: { targetKcalSnapshot: true },
      }),
      prisma.mealPlanMeal.findMany({
        where: { mealPlanId: planId, mealType: { in: [...REBATCH_MEAL_TYPES] } },
        select: { mealType: true },
        distinct: ['mealType'],
      }),
      prisma.mealPlanMeal.findMany({
        where: { mealPlanId: planId, mealType: { in: [...REBATCH_MEAL_TYPES] } },
        select: {
          dayOfWeek: true,
          mealType: true,
          recipeId: true,
          recipe: {
            select: {
              id: true,
              name: true,
              maxStorageDays: true,
              kcalPerServing: true,
              batchFriendly: true,
              tags: true,
              ingredients: { select: { ingredient: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);
    const plannedMealTypes = REBATCH_MEAL_TYPES.filter((mealType) =>
      planMealTypes.some((meal) => meal.mealType === mealType),
    );
    const primaryTarget = planParticipants.length
      ? Math.max(...planParticipants.map((participant) => participant.targetKcalSnapshot))
      : DEFAULT_TARGET_KCAL_PER_PERSON;
    const mealTargets = buildMealTargets(
      plannedMealTypes.length ? plannedMealTypes : [...REBATCH_MEAL_TYPES],
      primaryTarget,
    );
    const cumulativeMealTargets = buildCumulativeMealTargets(
      plannedMealTypes.length ? plannedMealTypes : [...REBATCH_MEAL_TYPES],
      primaryTarget,
    );
    const dayContexts: PlanDayContexts = new Map();
    const dayKcalTotals: PlanDayKcalTotals = new Map();

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
      const otherMeals = planMeals.filter((meal) => meal.mealType !== mealType);

      // Fetch all recipes of this type once (for fallback on splits)
      const rawRecipesOfType = await prisma.recipe.findMany({
        where: {
          type: mealType,
          nutritionVerified: true,
          role: 'meal',
          ...(mealType === 'lunch' ? { batchFriendly: true } : {}),
          OR: [{ householdId: null }, { householdId: context.householdId }],
        },
        select: {
          id: true,
          name: true,
          maxStorageDays: true,
          kcalPerServing: true,
          batchFriendly: true,
          tags: true,
          ingredients: { select: { ingredient: { select: { name: true } } } },
        },
        orderBy: [{ maxStorageDays: 'desc' }, { name: 'asc' }],
      });
      const allRecipesOfType = normalizeCandidates(rawRecipesOfType);
      if (allRecipesOfType.length === 0) continue;
      dayContexts.clear();
      dayKcalTotals.clear();

      for (const existingMeal of otherMeals) {
        const [existingRecipe] = normalizeCandidates([existingMeal.recipe]);
        applyRecipeToDayContexts(dayContexts, existingRecipe, existingMeal.mealType, [existingMeal.dayOfWeek]);
        applyRecipeToDayKcalTotals(dayKcalTotals, existingRecipe, [existingMeal.dayOfWeek]);
      }

      const updates: ReturnType<typeof prisma.mealPlanMeal.update>[] = [];

      for (const group of uniqueGroups) {
        const daysInGroup = groups
          .map((g, idx) => (g === group ? idx + 1 : null))
          .filter((d): d is number => d !== null);

        const firstDay = daysInGroup[0];
        const firstMeal = firstDay ? mealsByDay.get(firstDay) : null;
        const preferredRecipeId = firstMeal?.recipeId ?? meals[0].recipeId;
        const requiredStorageDays = daysInGroup.length;

        const chosenRecipe = chooseRecipeForGroup(allRecipesOfType, {
          usedIds: usedRecipes,
          requiredStorageDays,
          targetKcalPerServing: mealTargets[mealType] ?? DEFAULT_TARGET_KCAL_PER_PERSON,
          preferredRecipeId,
          mealType,
          daysInGroup,
          dayContexts,
          dayKcalTotals,
          cumulativeTargetKcal: cumulativeMealTargets[mealType] ?? primaryTarget,
        });

        usedRecipes.add(chosenRecipe.id);
        applyRecipeToDayContexts(dayContexts, chosenRecipe, mealType, daysInGroup);
        applyRecipeToDayKcalTotals(dayKcalTotals, chosenRecipe, daysInGroup);
        for (const existingMeal of planMeals) {
          if (existingMeal.mealType !== mealType || !daysInGroup.includes(existingMeal.dayOfWeek)) continue;
          existingMeal.recipe = {
            id: chosenRecipe.id,
            name: chosenRecipe.name,
            maxStorageDays: chosenRecipe.maxStorageDays,
            kcalPerServing: chosenRecipe.kcalPerServing,
            batchFriendly: chosenRecipe.batchFriendly ?? false,
            tags: chosenRecipe.tags ?? '[]',
            ingredients: (chosenRecipe.ingredientNames ?? []).map((name) => ({
              ingredient: { name },
            })),
          };
        }

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
    const updated = await prisma.mealPlan.findFirstOrThrow({
      where: { id: planId, householdId: context.householdId },
      include: {
        participants: true,
        meals: {
          include: {
            portions: true,
            recipe: {
              include: {
                variantOf: true,
                variants: true,
                componentLinks: {
                  include: {
                    componentRecipe: {
                      include: { ingredients: { include: { ingredient: true } } },
                    },
                  },
                },
                ingredients: { include: { ingredient: true } },
              },
            },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
