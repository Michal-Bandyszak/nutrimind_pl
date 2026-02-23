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
  recipes: { id: string }[],
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
  // Map group number → recipe id (one recipe per group).
  // Pick a distinct recipe for each group where possible; fall back to
  // wrap-around only when there are more groups than available recipes.
  const groupRecipe: Record<number, string> = {};
  const usedIds = new Set<string>();
  uniqueGroups.forEach((g, i) => {
    const unused = shuffled.find((r) => !usedIds.has(r.id));
    const chosen = unused ?? shuffled[i % shuffled.length];
    groupRecipe[g] = chosen.id;
    usedIds.add(chosen.id);
  });
  // Map group number → stable batch UUID
  const groupBatchId: Record<number, string> = {};
  uniqueGroups.forEach((g) => {
    groupBatchId[g] = crypto.randomUUID();
  });

  return groups.map((group, idx) => {
    const dayOfWeek = idx + 1;
    // batchDayNum = position within this group (1-based)
    const batchDayNum = groups.slice(0, idx).filter((g) => g === group).length + 1;
    return {
      mealPlanId: planId,
      dayOfWeek,
      mealType,
      recipeId: groupRecipe[group],
      servings,
      batchGroupId: groupBatchId[group],
      batchDayNum,
    };
  });
}

export async function generateWeekPlan(
  config: BatchConfig = DEFAULT_BATCH_CONFIG,
  weekStart?: Date,
): Promise<MealPlanWithMeals> {
  const start = weekStart ?? getMonday();

  const [allBreakfasts, allSecondBreakfasts, allLunches, allDinners, allCocktails, allSnacks] = await Promise.all([
    prisma.recipe.findMany({ where: { type: 'breakfast' } }),
    prisma.recipe.findMany({ where: { type: 'second_breakfast' } }),
    prisma.recipe.findMany({ where: { type: 'lunch' } }),
    prisma.recipe.findMany({ where: { type: 'dinner' } }),
    prisma.recipe.findMany({ where: { type: 'cocktail' } }),
    prisma.recipe.findMany({ where: { type: 'snack' } }),
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

  // Breakfast, second_breakfast, lunch, dinner with custom batch config
  rows.push(...buildMealRows(plan.id, 'breakfast',        config.breakfast,        allBreakfasts,       SERVINGS));
  if (allSecondBreakfasts.length) {
    rows.push(...buildMealRows(plan.id, 'second_breakfast', config.second_breakfast, allSecondBreakfasts, SERVINGS));
  }
  rows.push(...buildMealRows(plan.id, 'lunch',            config.lunch,            allLunches,          SERVINGS));
  rows.push(...buildMealRows(plan.id, 'dinner',           config.dinner,           allDinners,          SERVINGS));

  // Cocktails — one per day, no batching, own draggable row
  if (allCocktails.length) {
    const shuffledCocktails = shuffle(allCocktails);
    for (let day = 1; day <= 7; day++) {
      rows.push({
        mealPlanId: plan.id,
        dayOfWeek: day,
        mealType: 'cocktail',
        recipeId: shuffledCocktails[(day - 1) % shuffledCocktails.length].id,
        servings: SERVINGS,
        batchGroupId: null,
        batchDayNum: null,
      });
    }
  }

  // Snacks — one per day, no batching
  if (allSnacks.length) {
    const shuffledSnacks = shuffle(allSnacks);
    for (let day = 1; day <= 7; day++) {
      rows.push({
        mealPlanId: plan.id,
        dayOfWeek: day,
        mealType: 'snack',
        recipeId: shuffledSnacks[(day - 1) % shuffledSnacks.length].id,
        servings: SERVINGS,
        batchGroupId: null,
        batchDayNum: null,
      });
    }
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
