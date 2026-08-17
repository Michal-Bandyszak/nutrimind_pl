import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeRecipeName } from '../lib/utils/recipeConstants';

const prisma = new PrismaClient();
const STOP_WORDS = new Set(['a', 'do', 'i', 'na', 'oraz', 'po', 'w', 'z', 'ze']);
const shouldFixExact = process.argv.includes('--fix-exact');

type RecipeRow = Awaited<ReturnType<typeof loadRecipes>>[number];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return new Set(normalize(value).split(' ').filter((token) => token && !STOP_WORDS.has(token)));
}

function ingredientMap(recipe: RecipeRow) {
  return new Map(recipe.ingredients.map(({ amountG, ingredient }) => [normalize(ingredient.name), amountG]));
}

function recipeFingerprint(recipe: RecipeRow) {
  return JSON.stringify({
    type: recipe.type,
    sourceDiet: recipe.sourceDiet,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    batchFriendly: recipe.batchFriendly,
    maxStorageDays: recipe.maxStorageDays,
    kcalPerServing: recipe.kcalPerServing,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbsG,
    fatG: recipe.fatG,
    fiberG: recipe.fiberG,
    instructions: recipe.instructions,
    tags: recipe.tags,
    baseServings: recipe.baseServings,
    ingredientBasis: recipe.ingredientBasis,
    source: recipe.source,
    householdId: recipe.householdId,
    nutritionReady: recipe.nutritionReady,
    ingredients: [...recipe.ingredients]
      .map(({ amountG, displayText, scalesLinearly, ingredient }) => ({
        name: normalize(ingredient.name),
        amountG,
        displayText,
        scalesLinearly,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  });
}

function jaccard(left: Set<string>, right: Set<string>) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  return [...left].filter((value) => right.has(value)).length / union.size;
}

function proportionSimilarity(left: Map<string, number>, right: Map<string, number>) {
  const leftTotal = [...left.values()].reduce((sum, amount) => sum + amount, 0);
  const rightTotal = [...right.values()].reduce((sum, amount) => sum + amount, 0);
  if (leftTotal === 0 || rightTotal === 0) return 0;

  const names = new Set([...left.keys(), ...right.keys()]);
  const distance = [...names].reduce((sum, name) => {
    const leftShare = (left.get(name) ?? 0) / leftTotal;
    const rightShare = (right.get(name) ?? 0) / rightTotal;
    return sum + Math.abs(leftShare - rightShare);
  }, 0);
  return 1 - distance / 2;
}

function loadRecipes() {
  return prisma.recipe.findMany({
    where: { role: 'meal', variantKey: 'base' },
    select: {
      id: true,
      name: true,
      type: true,
      sourceDiet: true,
      prepTimeMin: true,
      cookTimeMin: true,
      batchFriendly: true,
      maxStorageDays: true,
      kcalPerServing: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      fiberG: true,
      instructions: true,
      tags: true,
      baseServings: true,
      ingredientBasis: true,
      source: true,
      householdId: true,
      nutritionReady: true,
      createdAt: true,
      ingredients: {
        select: {
          amountG: true,
          displayText: true,
          scalesLinearly: true,
          ingredient: { select: { name: true } },
        },
      },
      _count: {
        select: {
          mealPlanMeals: true,
          variants: true,
          componentLinks: true,
          usedAsComponent: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

async function main() {
  const recipes = await loadRecipes();
  const candidates = [];
  const exactPairs: Array<[RecipeRow, RecipeRow]> = [];

  for (let leftIndex = 0; leftIndex < recipes.length; leftIndex += 1) {
    const left = recipes[leftIndex];
    const leftIngredients = ingredientMap(left);

    for (let rightIndex = leftIndex + 1; rightIndex < recipes.length; rightIndex += 1) {
      const right = recipes[rightIndex];
      const sameName = normalize(left.name) === normalize(right.name);
      if (left.type !== right.type && !sameName) continue;

      const rightIngredients = ingredientMap(right);
      const ingredientScore = jaccard(new Set(leftIngredients.keys()), new Set(rightIngredients.keys()));
      const proportionScore = proportionSimilarity(leftIngredients, rightIngredients);
      const nameScore = jaccard(tokens(left.name), tokens(right.name));
      const sameIngredients = ingredientScore === 1 && leftIngredients.size >= 3;
      const exact = sameName && recipeFingerprint(left) === recipeFingerprint(right);

      if (!sameName && !sameIngredients && !(ingredientScore >= 0.72 && proportionScore >= 0.72)) continue;
      if (exact) exactPairs.push([left, right]);

      candidates.push({
        kind: exact ? 'exact' : sameName ? 'same-name' : sameIngredients ? 'same-ingredients' : 'near',
        leftId: left.id,
        left: left.name,
        leftType: left.type,
        leftSource: left.sourceDiet,
        rightId: right.id,
        right: right.name,
        rightType: right.type,
        rightSource: right.sourceDiet,
        ingredientScore: Number(ingredientScore.toFixed(2)),
        proportionScore: Number(proportionScore.toFixed(2)),
        nameScore: Number(nameScore.toFixed(2)),
        kcalDifference: Math.abs((left.kcalPerServing ?? 0) - (right.kcalPerServing ?? 0)),
        references: left._count.mealPlanMeals + right._count.mealPlanMeals,
        variants: left._count.variants + right._count.variants,
      });
    }
  }

  const byType = recipes.reduce<Record<string, number>>((counts, recipe) => {
    counts[recipe.type] = (counts[recipe.type] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Audited ${recipes.length} base meal recipes.`);
  console.table(byType);
  console.log(`Found ${candidates.length} duplicate candidate pair(s).`);
  console.table(candidates);

  if (!shouldFixExact) {
    console.log(`Exact duplicates safe to merge: ${exactPairs.length}. Run with --fix-exact to merge them.`);
    return;
  }

  const removedIds = new Set<string>();
  for (const [left, right] of exactPairs) {
    if (removedIds.has(left.id) || removedIds.has(right.id)) continue;
    const relationalLinks = left._count.variants + right._count.variants
      + left._count.componentLinks + right._count.componentLinks
      + left._count.usedAsComponent + right._count.usedAsComponent;
    // ponytail: only merge leaf duplicates; add relation conflict handling if the audit ever finds a linked exact duplicate.
    if (relationalLinks > 0) {
      console.log(`Skipped linked duplicate: ${left.name} | ${right.name}`);
      continue;
    }

    const survivor = left._count.mealPlanMeals >= right._count.mealPlanMeals ? left : right;
    const duplicate = survivor.id === left.id ? right : left;
    const mealPlanMeals = await prisma.mealPlanMeal.findMany({
      where: { recipeId: { in: [left.id, right.id] } },
    });
    const backupDirectory = path.join(process.cwd(), 'private/backups');
    const backupPath = path.join(
      backupDirectory,
      `exact-recipe-duplicate-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    );
    fs.mkdirSync(backupDirectory, { recursive: true });
    fs.writeFileSync(backupPath, `${JSON.stringify({ recipes: [left, right], mealPlanMeals }, null, 2)}\n`);

    await prisma.$transaction([
      prisma.mealPlanMeal.updateMany({
        where: { recipeId: duplicate.id },
        data: { recipeId: survivor.id },
      }),
      prisma.recipe.delete({ where: { id: duplicate.id } }),
      prisma.recipe.update({
        where: { id: survivor.id },
        data: { name: normalizeRecipeName(survivor.name) },
      }),
    ]);
    removedIds.add(duplicate.id);
    console.log(`Merged exact duplicate into: ${normalizeRecipeName(survivor.name)} (backup: ${backupPath})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
