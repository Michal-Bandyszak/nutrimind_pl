import { prisma } from '@/lib/db/prisma';
import type { MealPlanWithMeals, BatchConfig, MealDividers } from '@/lib/types';
import { dividersToGroups, DEFAULT_BATCH_CONFIG } from '@/lib/types';

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

/** Build meal rows for one meal type based on divider config */
function buildMealRows(
  planId: string,
  mealType: string,
  dividers: MealDividers,
  recipes: { id: string; maxStorageDays: number }[],
  servings: number,
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

  uniqueGroups.forEach((group, i) => {
    const days = groups
      .map((g, idx) => (g === group ? idx + 1 : null))
      .filter((d): d is number => d !== null);

    // Keep the configured group intact. Prefer recipes whose storage time can
    // cover the whole block, but do not silently split a user-selected group.
    const requiredStorageDays = days.length;
    const unusedFit = shuffled.find((r) => r.maxStorageDays >= requiredStorageDays && !usedIds.has(r.id));
    const anyFit = shuffled.find((r) => r.maxStorageDays >= requiredStorageDays);
    const unused = shuffled.find((r) => !usedIds.has(r.id));
    const chosen = unusedFit ?? anyFit ?? unused ?? shuffled[i % shuffled.length];
    usedIds.add(chosen.id);

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
  config: BatchConfig = DEFAULT_BATCH_CONFIG,
  weekStart?: Date,
): Promise<MealPlanWithMeals> {
  const start = weekStart ?? getMonday();

  const [allBreakfasts, allSecondBreakfasts, allLunches, allDinners, allCocktails] = await Promise.all([
    prisma.recipe.findMany({ where: { type: 'breakfast',        nutritionVerified: true } }),
    prisma.recipe.findMany({ where: { type: 'second_breakfast', nutritionVerified: true } }),
    prisma.recipe.findMany({ where: { type: 'lunch',            nutritionVerified: true, batchFriendly: true } }),
    prisma.recipe.findMany({ where: { type: 'dinner',           nutritionVerified: true } }),
    prisma.recipe.findMany({ where: { type: 'cocktail',         nutritionVerified: true } }),
  ]);

  if (!allBreakfasts.length) throw new Error('Brak przepisów na śniadanie.');
  if (!allLunches.length)    throw new Error('Brak przepisów na obiad.');
  if (!allDinners.length)    throw new Error('Brak przepisów na kolację.');

  // Archive current active plan
  await prisma.mealPlan.updateMany({
    where: { status: 'active' },
    data: { status: 'archived' },
  });

  const plan = await prisma.mealPlan.create({
    data: { name: formatWeekLabel(start), weekStart: start, status: 'active' },
  });

  const SERVINGS = 2;
  const rows: {
    mealPlanId: string;
    dayOfWeek: number;
    mealType: string;
    recipeId: string;
    servings: number;
    batchGroupId: string | null;
    batchDayNum: number | null;
  }[] = [];

  // Breakfast, second_breakfast, lunch, dinner, cocktail with custom batch config
  rows.push(...buildMealRows(plan.id, 'breakfast',        config.breakfast,        allBreakfasts,       SERVINGS));
  if (allSecondBreakfasts.length) {
    rows.push(...buildMealRows(plan.id, 'second_breakfast', config.second_breakfast, allSecondBreakfasts, SERVINGS));
  }
  rows.push(...buildMealRows(plan.id, 'lunch',            config.lunch,            allLunches,          SERVINGS));
  rows.push(...buildMealRows(plan.id, 'dinner',           config.dinner,           allDinners,          SERVINGS));
  if (allCocktails.length) {
    rows.push(...buildMealRows(plan.id, 'cocktail',         config.cocktail,         allCocktails,        SERVINGS));
  }

  await prisma.mealPlanMeal.createMany({ data: rows });
  return fetchPlanWithMeals(plan.id);
}

export async function getActivePlan(): Promise<MealPlanWithMeals | null> {
  const plan = await prisma.mealPlan.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) return null;
  return fetchPlanWithMeals(plan.id);
}

async function fetchPlanWithMeals(id: string): Promise<MealPlanWithMeals> {
  const plan = await prisma.mealPlan.findUniqueOrThrow({
    where: { id },
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
  return plan as MealPlanWithMeals;
}
