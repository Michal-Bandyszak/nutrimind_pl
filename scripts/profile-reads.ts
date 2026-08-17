import { PrismaClient } from '@prisma/client';
import { PLAN_VIEW_SELECT } from '../lib/types';

const db = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
db.$on('query', () => { queryCount += 1; });

let queryCount = 0;

const SHOPPING_SELECT = {
  name: true,
  meals: {
    select: {
      id: true,
      dayOfWeek: true,
      mealType: true,
      servings: true,
      batchGroupId: true,
      recipe: {
        select: {
          name: true,
          ingredientBasis: true,
          baseServings: true,
          ingredients: {
            select: {
              amountG: true,
              scalesLinearly: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  packageSizeG: true,
                  packageUnit: true,
                  packageLabel: true,
                  pieceWeightG: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function profile(label: string, query: () => Promise<unknown>) {
  await query();
  const durations: number[] = [];
  const sizes: number[] = [];
  const queryCounts: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    queryCount = 0;
    const started = performance.now();
    const value = await query();
    durations.push(Math.round(performance.now() - started));
    sizes.push(Buffer.byteLength(JSON.stringify(value), 'utf8'));
    queryCounts.push(queryCount);
  }
  console.log(JSON.stringify({
    label,
    medianMs: median(durations),
    medianQueries: median(queryCounts),
    medianJsonBytes: median(sizes),
    durations,
  }));
}

async function main() {
  const planIdArg = process.argv.find((arg) => arg.startsWith('--plan-id='))?.slice('--plan-id='.length);
  const householdIdArg = process.argv.find((arg) => arg.startsWith('--household-id='))?.slice('--household-id='.length);
  const plan = await db.mealPlan.findFirst({
    where: planIdArg ? { id: planIdArg } : { ...(householdIdArg ? { householdId: householdIdArg } : {}), status: 'active' },
    select: { id: true, householdId: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!plan) throw new Error('Nie znaleziono planu. Podaj --plan-id=... albo --household-id=...');

  await profile('plan', () => db.mealPlan.findFirst({
    where: { id: plan.id, householdId: plan.householdId },
    select: PLAN_VIEW_SELECT,
  }));
  await profile('shopping', () => db.mealPlan.findFirst({
    where: { id: plan.id, householdId: plan.householdId },
    select: SHOPPING_SELECT,
  }));
  await profile('candidates', () => db.recipe.findMany({
    where: {
      type: { in: ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'cocktail'] },
      nutritionReady: true,
      role: 'meal',
      OR: [{ householdId: null }, { householdId: plan.householdId }],
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
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
