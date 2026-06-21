import { prisma } from '@/lib/db/prisma';
import type { MealPlanWithMeals, BatchConfig, MealDividers } from '@/lib/types';
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMonday(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('pl-PL', opts)} – ${end.toLocaleDateString('pl-PL', opts)}`;
}

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

  const shuffled = shuffle(recipes);
  const usedIds = new Set<string>();

  const dayAssignments = new Map<number, { recipeId: string; batchGroupId: string; batchDayNum: number }>();

  uniqueGroups.forEach((group) => {
    const days = groups
      .map((g, idx) => (g === group ? idx + 1 : null))
      .filter((d): d is number => d !== null);

    // Keep the configured group intact. Prefer recipes whose storage time can
    // cover the whole block, but do not silently split a user-selected group.
    const requiredStorageDays = days.length;
    const chosen = chooseRecipeForGroup(shuffled, {
      usedIds,
      requiredStorageDays,
      targetKcalPerServing,
      mealType,
      daysInGroup: days,
      dayContexts,
      dayKcalTotals,
      cumulativeTargetKcal,
    });
    usedIds.add(chosen.id);
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
      const fallbackRecipe = shuffled[0];
      return {
        mealPlanId: planId,
        dayOfWeek,
        mealType,
        recipeId: fallbackRecipe.id,
        servings,
        batchGroupId: crypto.randomUUID(),
        batchDayNum: 1,
      };
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
): Promise<MealPlanWithMeals> {
  if (!profiles.length) throw new Error('Brak aktywnych profili żywieniowych.');
  const start = weekStart ?? getMonday();
  const targetKcalPerPerson = Math.max(...profiles.map((profile) => profile.targetKcal));
  const recipeScope = { OR: [{ householdId: null }, { householdId }] };

  const [allBreakfasts, allSecondBreakfasts, allLunches, allDinners, allCocktails] = await Promise.all([
    prisma.recipe.findMany({
      where: { type: 'breakfast', nutritionVerified: true, role: 'meal', ...recipeScope },
      select: {
        id: true,
        name: true,
        maxStorageDays: true,
        kcalPerServing: true,
        batchFriendly: true,
        tags: true,
        ingredients: { select: { ingredient: { select: { name: true } } } },
      },
    }),
    prisma.recipe.findMany({
      where: { type: 'second_breakfast', nutritionVerified: true, role: 'meal', ...recipeScope },
      select: {
        id: true,
        name: true,
        maxStorageDays: true,
        kcalPerServing: true,
        batchFriendly: true,
        tags: true,
        ingredients: { select: { ingredient: { select: { name: true } } } },
      },
    }),
    prisma.recipe.findMany({
      where: { type: 'lunch', nutritionVerified: true, batchFriendly: true, role: 'meal', ...recipeScope },
      select: {
        id: true,
        name: true,
        maxStorageDays: true,
        kcalPerServing: true,
        batchFriendly: true,
        tags: true,
        ingredients: { select: { ingredient: { select: { name: true } } } },
      },
    }),
    prisma.recipe.findMany({
      where: { type: 'dinner', nutritionVerified: true, role: 'meal', ...recipeScope },
      select: {
        id: true,
        name: true,
        maxStorageDays: true,
        kcalPerServing: true,
        batchFriendly: true,
        tags: true,
        ingredients: { select: { ingredient: { select: { name: true } } } },
      },
    }),
    prisma.recipe.findMany({
      where: { type: 'cocktail', nutritionVerified: true, role: 'meal', ...recipeScope },
      select: {
        id: true,
        name: true,
        maxStorageDays: true,
        kcalPerServing: true,
        batchFriendly: true,
        tags: true,
        ingredients: { select: { ingredient: { select: { name: true } } } },
      },
    }),
  ]);
  const breakfasts = normalizeCandidates(allBreakfasts);
  const secondBreakfasts = normalizeCandidates(allSecondBreakfasts);
  const lunches = normalizeCandidates(allLunches);
  const dinners = normalizeCandidates(allDinners);
  const cocktails = normalizeCandidates(allCocktails);

  if (!breakfasts.length) throw new Error('Brak przepisów na śniadanie.');
  if (!lunches.length)    throw new Error('Brak przepisów na obiad.');
  if (!dinners.length)    throw new Error('Brak przepisów na kolację.');

  // Archive current active plan
  await prisma.mealPlan.updateMany({
    where: { householdId, status: 'active' },
    data: { status: 'archived' },
  });

  const plan = await prisma.mealPlan.create({
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

  const servingsByProfile = profiles.map((profile) => ({
    profile,
    servings: Math.max(0.25, Math.round((profile.targetKcal / targetKcalPerPerson) * 4) / 4),
  }));
  const SERVINGS = servingsByProfile.reduce((sum, item) => sum + item.servings, 0);
  const rows: {
    mealPlanId: string;
    dayOfWeek: number;
    mealType: string;
    recipeId: string;
    servings: number;
    batchGroupId: string | null;
    batchDayNum: number | null;
  }[] = [];
  const dayContexts: PlanDayContexts = new Map();
  const dayKcalTotals: PlanDayKcalTotals = new Map();

  const plannedMealTypes = [
    'breakfast',
    secondBreakfasts.length ? 'second_breakfast' : null,
    'lunch',
    'dinner',
    cocktails.length ? 'cocktail' : null,
  ].filter((mealType): mealType is string => mealType !== null);
  const mealTargets = buildMealTargets(plannedMealTypes, targetKcalPerPerson);
  const cumulativeMealTargets = buildCumulativeMealTargets(plannedMealTypes, targetKcalPerPerson);

  // Breakfast, second_breakfast, lunch, dinner, cocktail with custom batch config
  rows.push(...buildMealRows(
    plan.id,
    'breakfast',
    config.breakfast,
    breakfasts,
    SERVINGS,
    mealTargets.breakfast,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.breakfast ?? targetKcalPerPerson,
  ));
  if (secondBreakfasts.length) {
    rows.push(...buildMealRows(
      plan.id,
      'second_breakfast',
      config.second_breakfast,
      secondBreakfasts,
      SERVINGS,
      mealTargets.second_breakfast,
      dayContexts,
      dayKcalTotals,
      cumulativeMealTargets.second_breakfast ?? targetKcalPerPerson,
    ));
  }
  rows.push(...buildMealRows(
    plan.id,
    'lunch',
    config.lunch,
    lunches,
    SERVINGS,
    mealTargets.lunch,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.lunch ?? targetKcalPerPerson,
  ));
  rows.push(...buildMealRows(
    plan.id,
    'dinner',
    config.dinner,
    dinners,
    SERVINGS,
    mealTargets.dinner,
    dayContexts,
    dayKcalTotals,
    cumulativeMealTargets.dinner ?? targetKcalPerPerson,
  ));
  if (cocktails.length) {
    rows.push(...buildMealRows(
      plan.id,
      'cocktail',
      config.cocktail,
      cocktails,
      SERVINGS,
      mealTargets.cocktail,
      dayContexts,
      dayKcalTotals,
      cumulativeMealTargets.cocktail ?? targetKcalPerPerson,
    ));
  }

  await prisma.mealPlanMeal.createMany({ data: rows });
  const meals = await prisma.mealPlanMeal.findMany({ where: { mealPlanId: plan.id } });
  const participantByProfile = new Map(
    plan.participants.map((participant) => [participant.personProfileId, participant]),
  );
  await prisma.mealPlanMealPortion.createMany({
    data: meals.flatMap((meal) =>
      servingsByProfile.map(({ profile, servings }) => ({
        mealPlanMealId: meal.id,
        participantId: participantByProfile.get(profile.id)!.id,
        personProfileId: profile.id,
        servings,
      })),
    ),
  });
  return fetchPlanWithMeals(plan.id, householdId);
}

export async function getActivePlan(householdId: string): Promise<MealPlanWithMeals | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { householdId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) return null;
  return fetchPlanWithMeals(plan.id, householdId);
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
  return plan as MealPlanWithMeals;
}
