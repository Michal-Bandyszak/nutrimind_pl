import { PrismaClient } from '@prisma/client';
import { getCanonicalOcrRecipeName } from '../lib/data/ocrRecipeNameFixes';

const prisma = new PrismaClient();
const OCR_SOURCE_PREFIXES = ['Import OCR', 'OCRDiety'];
const OCR_SOURCE_DIET_RENAMES: Record<string, string> = {
  'OCRDiety Lunch 2026-06-15': 'Import OCR Lunch A',
  'OCRDiety Obiad 2026-06-15': 'Import OCR Obiad A',
  'OCRDiety Kolacja 2026-06-15': 'Import OCR Kolacja A',
};
const isDryRun = process.argv.includes('--dry-run');

type RecipeRow = {
  id: string;
  name: string;
  sourceDiet: string | null;
  variantKey: string;
  createdAt: Date;
};

function groupKey(recipe: RecipeRow) {
  return JSON.stringify({
    sourceDiet: recipe.sourceDiet ?? null,
    variantKey: recipe.variantKey,
    canonicalName: getCanonicalOcrRecipeName(recipe.name),
  });
}

function pickSurvivor(recipes: RecipeRow[]) {
  const canonicalName = getCanonicalOcrRecipeName(recipes[0]?.name ?? '');
  const canonicalMatch = recipes.find((recipe) => recipe.name === canonicalName);
  if (canonicalMatch) return canonicalMatch;

  return [...recipes].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
}

async function mergeRecipeGroup(recipes: RecipeRow[]) {
  const canonicalName = getCanonicalOcrRecipeName(recipes[0].name);
  const survivor = pickSurvivor(recipes);
  const duplicates = recipes.filter((recipe) => recipe.id !== survivor.id);

  await prisma.$transaction(async (tx) => {
    if (survivor.name !== canonicalName) {
      await tx.recipe.update({
        where: { id: survivor.id },
        data: { name: canonicalName },
      });
    }

    for (const duplicate of duplicates) {
      await tx.mealPlanMeal.updateMany({
        where: { recipeId: duplicate.id },
        data: { recipeId: survivor.id },
      });

      await tx.recipe.updateMany({
        where: { variantOfId: duplicate.id },
        data: { variantOfId: survivor.id },
      });

      await tx.recipeComponent.updateMany({
        where: { parentRecipeId: duplicate.id },
        data: { parentRecipeId: survivor.id },
      });

      await tx.recipeComponent.updateMany({
        where: { componentRecipeId: duplicate.id },
        data: { componentRecipeId: survivor.id },
      });

      await tx.recipe.delete({
        where: { id: duplicate.id },
      });
    }
  });

  return {
    canonicalName,
    survivor,
    duplicates,
  };
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: {
      OR: OCR_SOURCE_PREFIXES.map((prefix) => ({
        sourceDiet: {
          startsWith: prefix,
        },
      })),
    },
    select: {
      id: true,
      name: true,
      sourceDiet: true,
      variantKey: true,
      createdAt: true,
    },
    orderBy: [
      { sourceDiet: 'asc' },
      { variantKey: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  const grouped = new Map<string, RecipeRow[]>();
  for (const recipe of recipes) {
    const key = groupKey(recipe);
    const group = grouped.get(key) ?? [];
    group.push(recipe);
    grouped.set(key, group);
  }

  const actionableGroups = [...grouped.values()].filter((group) => {
    const canonicalName = getCanonicalOcrRecipeName(group[0].name);
    return group.length > 1 || group.some((recipe) => recipe.name !== canonicalName);
  });

  if (actionableGroups.length === 0) {
    console.log('✅ No OCR recipe names need fixing.');
  } else {
    console.log(`Found ${actionableGroups.length} OCR recipe group(s) to fix.${isDryRun ? ' [dry-run]' : ''}\n`);

    let mergedDuplicates = 0;
    for (const group of actionableGroups) {
      const canonicalName = getCanonicalOcrRecipeName(group[0].name);
      const currentNames = group.map((recipe) => recipe.name).join(' | ');

      if (isDryRun) {
        console.log(`• ${currentNames} -> ${canonicalName}`);
        continue;
      }

      const result = await mergeRecipeGroup(group);
      mergedDuplicates += result.duplicates.length;
      console.log(`✅ ${currentNames} -> ${result.canonicalName}`);
    }

    if (!isDryRun) {
      console.log(`\n🎉 Fixed ${actionableGroups.length} OCR recipe group(s); merged ${mergedDuplicates} duplicate record(s).`);
    }
  }

  const sourceDietUpdates = Object.entries(OCR_SOURCE_DIET_RENAMES).filter(([fromSourceDiet]) =>
    recipes.some((recipe) => recipe.sourceDiet === fromSourceDiet),
  );

  if (sourceDietUpdates.length === 0) {
    console.log(isDryRun ? '\nNo OCR sourceDiet values need aligning.' : '\n✅ OCR sourceDiet values are already aligned.');
    return;
  }

  console.log(`\n${isDryRun ? 'SourceDiet updates to apply:' : 'Applying sourceDiet updates:'}`);
  for (const [fromSourceDiet, toSourceDiet] of sourceDietUpdates) {
    if (isDryRun) {
      console.log(`• ${fromSourceDiet} -> ${toSourceDiet}`);
      continue;
    }

    const result = await prisma.recipe.updateMany({
      where: { sourceDiet: fromSourceDiet },
      data: { sourceDiet: toSourceDiet },
    });
    console.log(`✅ ${fromSourceDiet} -> ${toSourceDiet} (${result.count})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
