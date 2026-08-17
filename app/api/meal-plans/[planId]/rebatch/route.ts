import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  fetchPlanWithMeals,
  loadRecipeCandidates,
} from '@/lib/services/MealPlanGenerator';
import { isBatchConfig, dividersToGroups, type BatchConfig } from '@/lib/types';
import {
  applyRecipeToDayContexts,
  applyRecipeToDayKcalTotals,
  buildCumulativeMealTargets,
  buildMealTargets,
  chooseRecipeForGroup,
  DEFAULT_TARGET_KCAL_PER_PERSON,
  isRecipeEligibleForGroup,
  type PlanDayContexts,
  type PlanDayKcalTotals,
  type RecipeCandidate,
} from '@/lib/utils/mealPlanScoring';
import { inferRecipeSemantics, primarySemanticFamily } from '@/lib/utils/recipeSemantics';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { requireOwnedPlan } from '@/lib/access';

const REBATCH_MEAL_TYPES = [
  'breakfast',
  'second_breakfast',
  'lunch',
  'dinner',
  'cocktail',
] as const;

function normalizePlanRecipe(
  mealType: string,
  recipe: {
    id: string;
    name: string;
    maxStorageDays: number;
    kcalPerServing: number | null;
    batchFriendly: boolean;
    tags: string;
    ingredients: { ingredient: { name: string } }[];
  },
): RecipeCandidate {
  return {
    id: recipe.id,
    name: recipe.name,
    type: mealType,
    role: 'meal',
    nutritionReady: true,
    maxStorageDays: recipe.maxStorageDays,
    kcalPerServing: recipe.kcalPerServing,
    batchFriendly: recipe.batchFriendly,
    tags: recipe.tags,
    ingredientNames: recipe.ingredients.map((item) => item.ingredient.name),
  };
}

function familyFor(recipe: RecipeCandidate) {
  return primarySemanticFamily(inferRecipeSemantics({
    name: recipe.name,
    tags: recipe.tags,
    ingredientNames: recipe.ingredientNames,
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

    let body: { config?: unknown };
    try {
      body = await req.json() as { config?: unknown };
    } catch {
      return NextResponse.json({
        error: 'Nieprawidłowa konfiguracja batch cookingu.',
        code: 'INVALID_BATCH_CONFIG',
      }, { status: 400 });
    }
    if (!isBatchConfig(body.config)) {
      return NextResponse.json({
        error: 'Nieprawidłowa konfiguracja batch cookingu.',
        code: 'INVALID_BATCH_CONFIG',
      }, { status: 400 });
    }
    const config = body.config as BatchConfig;

    const [plan, candidatesByType] = await Promise.all([
      prisma.mealPlan.findFirstOrThrow({
        where: { id: planId, householdId: context.householdId },
        select: {
          participants: { select: { targetKcalSnapshot: true } },
          meals: {
            where: { mealType: { in: [...REBATCH_MEAL_TYPES] } },
            select: {
              id: true,
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
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      }),
      loadRecipeCandidates(context.householdId),
    ]);

    const plannedMealTypes = REBATCH_MEAL_TYPES.filter((mealType) =>
      plan.meals.some((meal) => meal.mealType === mealType),
    );
    const primaryTarget = plan.participants.length
      ? Math.max(...plan.participants.map((participant) => participant.targetKcalSnapshot))
      : DEFAULT_TARGET_KCAL_PER_PERSON;
    const mealTypesForTargets = plannedMealTypes.length ? plannedMealTypes : [...REBATCH_MEAL_TYPES];
    const mealTargets = buildMealTargets(mealTypesForTargets, primaryTarget);
    const cumulativeMealTargets = buildCumulativeMealTargets(mealTypesForTargets, primaryTarget);
    const allUpdates: {
      id: string;
      recipeId: string;
      batchGroupId: string;
      batchDayNum: number;
    }[] = [];

    for (const mealType of REBATCH_MEAL_TYPES) {
      const meals = plan.meals.filter((meal) => meal.mealType === mealType);
      if (!meals.length) continue;

      const recipes = candidatesByType[mealType] ?? [];
      const groups = dividersToGroups(config[mealType]);
      const uniqueGroups = [...new Set(groups)];
      const mealsByDay = new Map(meals.map((meal) => [meal.dayOfWeek, meal]));
      const usedRecipes = new Set<string>();
      const familyCounts = new Map<string, number>();
      const dayContexts: PlanDayContexts = new Map();
      const dayKcalTotals: PlanDayKcalTotals = new Map();

      for (const otherMeal of plan.meals) {
        if (otherMeal.mealType === mealType) continue;
        const otherRecipe = normalizePlanRecipe(otherMeal.mealType, otherMeal.recipe);
        applyRecipeToDayContexts(dayContexts, otherRecipe, otherMeal.mealType, [otherMeal.dayOfWeek]);
        applyRecipeToDayKcalTotals(dayKcalTotals, otherRecipe, [otherMeal.dayOfWeek]);
      }

      for (const group of uniqueGroups) {
        const daysInGroup = groups
          .map((value, index) => (value === group ? index + 1 : null))
          .filter((day): day is number => day !== null);
        const requiredStorageDays = daysInGroup.length;
        const firstMeal = mealsByDay.get(daysInGroup[0]);
        const preferredRecipe = recipes.find((recipe) => recipe.id === firstMeal?.recipeId);
        const preferredFamily = preferredRecipe ? familyFor(preferredRecipe) : null;
        const preferredIsSafe = preferredRecipe
          && isRecipeEligibleForGroup(preferredRecipe, mealType, requiredStorageDays)
          && (familyCounts.get(`${mealType}:${preferredFamily}`) ?? 0) < 2;
        const chosenRecipe = preferredIsSafe
          ? preferredRecipe
          : chooseRecipeForGroup(recipes, {
              usedIds: usedRecipes,
              requiredStorageDays,
              targetKcalPerServing: mealTargets[mealType] ?? DEFAULT_TARGET_KCAL_PER_PERSON,
              mealType,
              daysInGroup,
              dayContexts,
              dayKcalTotals,
              cumulativeTargetKcal: cumulativeMealTargets[mealType] ?? primaryTarget,
              familyCounts,
              random: () => 0,
            });

        usedRecipes.add(chosenRecipe.id);
        const family = familyFor(chosenRecipe);
        familyCounts.set(`${mealType}:${family}`, (familyCounts.get(`${mealType}:${family}`) ?? 0) + 1);
        applyRecipeToDayContexts(dayContexts, chosenRecipe, mealType, daysInGroup);
        applyRecipeToDayKcalTotals(dayKcalTotals, chosenRecipe, daysInGroup);

        const batchGroupId = crypto.randomUUID();
        daysInGroup.forEach((dayOfWeek, index) => {
          const meal = mealsByDay.get(dayOfWeek);
          if (!meal) return;
          allUpdates.push({
            id: meal.id,
            recipeId: chosenRecipe.id,
            batchGroupId,
            batchDayNum: index + 1,
          });
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(allUpdates.map((update) => tx.mealPlanMeal.update({
        where: { id: update.id, mealPlanId: planId },
        data: {
          recipeId: update.recipeId,
          batchGroupId: update.batchGroupId,
          batchDayNum: update.batchDayNum,
        },
      })));
    });

    const updated = await fetchPlanWithMeals(planId, context.householdId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
