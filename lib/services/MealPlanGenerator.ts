import { prisma } from '@/lib/db/prisma';
import type {
  MealPlanWithMeals,
  MealPlanSummary,
  BatchConfig,
  MealDividers,
} from '@/lib/types';
import { dividersToGroups, DEFAULT_BATCH_CONFIG } from '@/lib/types';
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
import { inferRecipeSemantics, primarySemanticFamily } from '@/lib/utils/recipeSemantics';
import { APP_TIME_ZONE, currentWeekStart } from '@/lib/utils/appDate';

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: APP_TIME_ZONE };
  return `${start.toLocaleDateString('pl-PL', opts)} – ${end.toLocaleDateString('pl-PL', opts)}`;
}

function normalizeCandidates(
  recipes: Array<{
    id: string;
    name: string;
    type: string;
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
    type: recipe.type,
    maxStorageDays: recipe.maxStorageDays,
    kcalPerServing: recipe.kcalPerServing,
    batchFriendly: recipe.batchFriendly,
    tags: recipe.tags,
    ingredientNames: recipe.ingredients.map((item) => item.ingredient.name),
  }));
}

const CANDIDATE_MEAL_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'cocktail'] as const;

export async function loadRecipeCandidates(householdId: string) {
  const recipes = await prisma.recipe.findMany({
    where: {
      type: { in: [...CANDIDATE_MEAL_TYPES] },
      nutritionVerified: true,
      role: 'meal',
      OR: [{ householdId: null }, { householdId }],
    },
    select: {
      id: true,
      name: true,
      type: true,
      maxStorageDays: true,
      kcalPerServing: true,
      batchFriendly: true,
      tags: true,
      ingredients: { select: { ingredient: { select: { name: true } } } },
    },
  });

  return CANDIDATE_MEAL_TYPES.reduce<Record<string, RecipeCandidate[]>>((byType, mealType) => {
    byType[mealType] = normalizeCandidates(recipes.filter((recipe) => recipe.type === mealType));
    return byType;
  }, {});
}

async function loadPreviousPlanRecipeIds(householdId: string) {
  const previous = await prisma.mealPlan.findFirst({
    where: { householdId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: { meals: { select: { recipeId: true } } },
  });
  return new Set(previous?.meals.map((meal) => meal.recipeId) ?? []);
}

/** Build meal rows for one meal type based on divider config */
function buildMealRows(
  planId: string,
  mealType: string,
  dividers: MealDividers,
  recipes: RecipeCandidate[],
  servings: number,
  targetKcalPerServing: number,
  dayContexts: PlanDayContexts,
  dayKcalTotals: PlanDayKcalTotals,
  cumulativeTargetKcal: number,
  familyCounts: Map<string, number>,
  previousPlanRecipeIds: ReadonlySet<string>,
): {
  mealPlanId: string;
  dayOfWeek: number;
  mealType: string;
  recipeId: string;
  servings: number;
  batchGroupId: string;
  batchDayNum: number;
}[] {
  const groups = dividersToGroups(dividers); // e.g. [1,1,1,2,2,2,2]
  const uniqueGroups = [...new Set(groups)]; // [1, 2]

  const usedIds = new Set<string>();

  const dayAssignments = new Map<number, { recipeId: string; batchGroupId: string; batchDayNum: number }>();

  uniqueGroups.forEach((group) => {
    const days = groups
      .map((g, idx) => (g === group ? idx + 1 : null))
      .filter((d): d is number => d !== null);

    // Keep the configured group intact. Prefer recipes whose storage time can
    // cover the whole block, but do not silently split a user-selected group.
    const requiredStorageDays = days.length;
    const chosen = chooseRecipeForGroup(recipes, {
      usedIds,
      requiredStorageDays,
      targetKcalPerServing,
      mealType,
      daysInGroup: days,
      dayContexts,
      dayKcalTotals,
      cumulativeTargetKcal,
      familyCounts,
      previousPlanRecipeIds,
    });
    usedIds.add(chosen.id);
    const chosenFamily = primarySemanticFamily(inferRecipeSemantics({
      name: chosen.name,
      tags: chosen.tags,
      ingredientNames: chosen.ingredientNames,
    }));
    familyCounts.set(`${mealType}:${chosenFamily}`, (familyCounts.get(`${mealType}:${chosenFamily}`) ?? 0) + 1);
    applyRecipeToDayContexts(dayContexts, chosen, mealType, days);
    applyRecipeToDayKcalTotals(dayKcalTotals, chosen, days);

    const batchGroupId = crypto.randomUUID();
    days.forEach((dayOfWeek, idxInGroup) => {
      dayAssignments.set(dayOfWeek, {
        recipeId: chosen.id,
        batchGroupId,
        batchDayNum: idxInGroup + 1,
      });
    });
  });

  return Array.from({ length: 7 }, (_, idx) => {
    const dayOfWeek = idx + 1;
    const assignment = dayAssignments.get(dayOfWeek);
    if (!assignment) {
      // Defensive fallback; should never happen with valid 7-day divider config.
      throw new Error(`Brak przypisania posiłku ${mealType} dla dnia ${dayOfWeek}.`);
    }

    return {
      mealPlanId: planId,
      dayOfWeek,
      mealType,
      recipeId: assignment.recipeId,
      servings,
      batchGroupId: assignment.batchGroupId,
      batchDayNum: assignment.batchDayNum,
    };
  });
}

export async function generateWeekPlan(
  householdId: string,
  profiles: { id: string; name: string; targetKcal: number; isPrimary: boolean }[],
  config: BatchConfig = DEFAULT_BATCH_CONFIG,
  weekStart?: Date,
): Promise<{ planId: string }> {
  if (!profiles.length) throw new Error('Brak aktywnych profili żywieniowych.');
  const start = weekStart ?? currentWeekStart();
  const targetKcalPerPerson = Math.max(...profiles.map((profile) => profile.targetKcal));
  const [candidatesByType, previousPlanRecipeIds] = await Promise.all([
    loadRecipeCandidates(householdId),
    loadPreviousPlanRecipeIds(householdId),
  ]);
  const breakfasts = candidatesByType.breakfast ?? [];
  const secondBreakfasts = candidatesByType.second_breakfast ?? [];
  const lunches = candidatesByType.lunch ?? [];
  const dinners = candidatesByType.dinner ?? [];
  const cocktails = candidatesByType.cocktail ?? [];

  if (!breakfasts.length) throw new Error('Brak przepisów na śniadanie.');
  if (!lunches.length)    throw new Error('Brak przepisów na obiad.');
  if (!dinners.length)    throw new Error('Brak przepisów na kolację.');

  const servingsByProfile = profiles.map((profile) => ({
    profile,
    servings: Math.max(0.25, Math.round((profile.targetKcal / targetKcalPerPerson) * 4) / 4),
  }));
  const SERVINGS = servingsByProfile.reduce((sum, item) => sum + item.servings, 0);
  const rows: ReturnType<typeof buildMealRows> = [];
  const dayContexts: PlanDayContexts = new Map();
  const dayKcalTotals: PlanDayKcalTotals = new Map();
  const familyCounts = new Map<string, number>();

  const plannedMealTypes = [
    'breakfast',
    secondBreakfasts.length ? 'second_breakfast' : null,
    'lunch',
    'dinner',
    cocktails.length ? 'cocktail' : null,
  ].filter((mealType): mealType is string => mealType !== null);
  const mealTargets = buildMealTargets(plannedMealTypes, targetKcalPerPerson);
  const cumulativeMealTargets = buildCumulativeMealTargets(plannedMealTypes, targetKcalPerPerson);

  rows.push(...buildMealRows(
    'pending',
    'breakfast',
    config.breakfast,
    breakfasts,
    SERVINGS,
    mealTargets.breakfast,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.breakfast ?? targetKcalPerPerson,
    familyCounts,
    previousPlanRecipeIds,
  ));
  if (secondBreakfasts.length) {
    rows.push(...buildMealRows(
      'pending',
      'second_breakfast',
      config.second_breakfast,
      secondBreakfasts,
      SERVINGS,
      mealTargets.second_breakfast,
      dayContexts,
      dayKcalTotals,
      cumulativeMealTargets.second_breakfast ?? targetKcalPerPerson,
      familyCounts,
      previousPlanRecipeIds,
    ));
  }
  rows.push(...buildMealRows(
    'pending',
    'lunch',
    config.lunch,
    lunches,
    SERVINGS,
    mealTargets.lunch,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.lunch ?? targetKcalPerPerson,
    familyCounts,
    previousPlanRecipeIds,
  ));
  rows.push(...buildMealRows(
    'pending',
    'dinner',
    config.dinner,
    dinners,
    SERVINGS,
    mealTargets.dinner,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.dinner ?? targetKcalPerPerson,
    familyCounts,
    previousPlanRecipeIds,
  ));
  if (cocktails.length) {
    rows.push(...buildMealRows(
      'pending',
      'cocktail',
      config.cocktail,
      cocktails,
      SERVINGS,
      mealTargets.cocktail,
      dayContexts,
      dayKcalTotals,
      cumulativeMealTargets.cocktail ?? targetKcalPerPerson,
      familyCounts,
      previousPlanRecipeIds,
    ));
  }

  const planId = await prisma.$transaction(async (tx) => {
    await tx.mealPlan.updateMany({
      where: { householdId, status: 'active' },
      data: { status: 'archived' },
    });

    const plan = await tx.mealPlan.create({
      data: {
        householdId,
        name: formatWeekLabel(start),
        weekStart: start,
        status: 'active',
        participants: {
          create: profiles.map((profile) => ({
            personProfileId: profile.id,
            nameSnapshot: profile.name,
            targetKcalSnapshot: profile.targetKcal,
            isPrimarySnapshot: profile.isPrimary,
          })),
        },
      },
      include: { participants: true },
    });

    await tx.mealPlanMeal.createMany({
      data: rows.map((row) => ({ ...row, mealPlanId: plan.id })),
    });
    const meals = await tx.mealPlanMeal.findMany({ where: { mealPlanId: plan.id } });
    const participantByProfile = new Map(
      plan.participants.map((participant) => [participant.personProfileId, participant]),
    );
    await tx.mealPlanMealPortion.createMany({
      data: meals.flatMap((meal) =>
        servingsByProfile.map(({ profile, servings }) => ({
          mealPlanMealId: meal.id,
          participantId: participantByProfile.get(profile.id)!.id,
          personProfileId: profile.id,
          servings,
        })),
      ),
    });
    return plan.id;
  });

  return { planId };
}

export async function getActivePlan(householdId: string): Promise<MealPlanWithMeals | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { householdId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) return null;
  return fetchPlanWithMeals(plan.id, householdId);
}

export async function getActivePlanSummary(householdId: string): Promise<MealPlanSummary | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { householdId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      weekStart: true,
      status: true,
      createdAt: true,
      participants: {
        select: {
          id: true,
          nameSnapshot: true,
          targetKcalSnapshot: true,
          isPrimarySnapshot: true,
        },
        orderBy: [{ isPrimarySnapshot: 'desc' }, { nameSnapshot: 'asc' }],
      },
    },
  });

  return plan as MealPlanSummary | null;
}

export async function fetchPlanWithMeals(id: string, householdId: string): Promise<MealPlanWithMeals> {
  const plan = await prisma.mealPlan.findFirstOrThrow({
    where: { id, householdId },
    include: {
      participants: { orderBy: [{ isPrimarySnapshot: 'desc' }, { nameSnapshot: 'asc' }] },
      meals: {
        include: {
          portions: true,
          recipe: {
            include: {
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
  return plan as MealPlanWithMeals;
}
