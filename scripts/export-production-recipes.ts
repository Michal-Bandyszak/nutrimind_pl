import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { isNutritionReady } from '../lib/utils/nutritionReady';

const prisma = new PrismaClient();
const CURATED_FILES = [
  'mediterranean-microbiome-recipes.json',
  'polish-balanced-recipes.json',
  'breakfast-recipes.json',
  'ocr-diety-recipes.json',
];

type RecipeKey = { name: string; sourceDiet: string | null; variantKey: string };

function canonicalSourceDiet(sourceDiet: string | null | undefined) {
  if (!sourceDiet) return null;
  if (sourceDiet === 'Zestaw sniadan A') return 'Sniadania OCR 2026-06-13';
  if (sourceDiet === 'Plan bazowy C') return 'NutriMind katalog bazowy';
  return sourceDiet;
}

function key(recipe: RecipeKey) {
  return JSON.stringify({
    name: recipe.name,
    sourceDiet: canonicalSourceDiet(recipe.sourceDiet),
    variantKey: recipe.variantKey || 'base',
  });
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function main() {
  const curatedDir = path.join(process.cwd(), 'data/curated');
  const trackedKeys = new Set<string>();
  for (const filename of CURATED_FILES) {
    const file = JSON.parse(fs.readFileSync(path.join(curatedDir, filename), 'utf8')) as {
      recipes?: RecipeKey[];
    };
    for (const recipe of file.recipes ?? []) {
      trackedKeys.add(key({
        name: recipe.name,
        sourceDiet: recipe.sourceDiet ?? null,
        variantKey: recipe.variantKey ?? 'base',
      }));
    }
  }

  const recipes = await prisma.recipe.findMany({
    where: { householdId: null, role: 'meal', variantKey: 'base' },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      type: true,
      role: true,
      variantKey: true,
      adjustmentNote: true,
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
      sourceDiet: true,
      tags: true,
      baseServings: true,
      ingredientBasis: true,
      source: true,
      ingredients: {
        select: {
          amountG: true,
          displayText: true,
          scalesLinearly: true,
          ingredient: { select: { name: true, category: true } },
        },
      },
    },
  });

  const missing = recipes.filter((recipe) => !trackedKeys.has(key({
    name: recipe.name,
    sourceDiet: recipe.sourceDiet,
    variantKey: recipe.variantKey,
  })));
  if (missing.length !== 77) {
    throw new Error(`Expected 77 missing base recipes, found ${missing.length}.`);
  }

  const exported = missing.map((recipe) => {
    const ingredients = recipe.ingredients.map((item) => ({
      name: item.ingredient.name,
      amountG: item.amountG,
      displayText: item.displayText ?? undefined,
      category: item.ingredient.category,
    }));
    return {
      name: recipe.name,
      type: recipe.type,
      role: 'meal',
      variantKey: 'base',
      adjustmentNote: recipe.adjustmentNote,
      prepTimeMin: recipe.prepTimeMin,
      cookTimeMin: recipe.cookTimeMin,
      batchFriendly: recipe.batchFriendly,
      maxStorageDays: recipe.maxStorageDays,
      kcalPerServing: recipe.kcalPerServing,
      proteinG: recipe.proteinG,
      carbsG: recipe.carbsG,
      fatG: recipe.fatG,
      fiberG: recipe.fiberG,
      instructions: parseJson<string[]>(recipe.instructions, []),
      sourceDiet: recipe.sourceDiet,
      tags: parseJson<string[]>(recipe.tags, []),
      baseServings: recipe.baseServings,
      ingredientBasis: recipe.ingredientBasis,
      source: recipe.source === 'user' ? 'curated' : recipe.source,
      nutritionReady: isNutritionReady({
        kcalPerServing: recipe.kcalPerServing,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        ingredientsValid: ingredients.length > 0 && ingredients.every((ingredient) => ingredient.amountG > 0 && Boolean(ingredient.name.trim())),
      }),
      ingredients,
    };
  });

  const outputPath = path.join(curatedDir, 'recovered-production-recipes.json');
  fs.writeFileSync(outputPath, `${JSON.stringify({
    description: 'Sanitized read-only export of global production recipes absent from tracked curated sources.',
    sourceDiet: 'NutriMind katalog bazowy',
    recipes: exported,
  }, null, 2)}\n`);
  console.log(`Exported ${exported.length} sanitized recipes to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => (prisma as any)['$' + 'disconnect']());
