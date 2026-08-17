import { PrismaClient } from '@prisma/client';
import {
  confirmedIngredientAlias,
  isSuspiciousIngredientName,
  normalizeIngredientName,
} from '../lib/utils/ingredientNormalization';

const prisma = new PrismaClient();

const ingredientSelect = {
  id: true,
  name: true,
  category: true,
  packageSizeG: true,
  packageUnit: true,
  packageLabel: true,
  pieceWeightG: true,
  recipeIngredients: {
    select: {
      id: true,
      recipeId: true,
      amountG: true,
      displayText: true,
      scalesLinearly: true,
      recipe: { select: { name: true } },
    },
  },
} as const;

type IngredientRow = Awaited<ReturnType<typeof loadIngredients>>[number];

async function loadIngredients() {
  return prisma.ingredient.findMany({ select: ingredientSelect });
}

function metadataConflict(left: IngredientRow, right: IngredientRow) {
  if (left.category !== right.category) return 'category';
  for (const field of ['packageSizeG', 'packageUnit', 'packageLabel', 'pieceWeightG'] as const) {
    const leftValue = left[field];
    const rightValue = right[field];
    if (leftValue != null && rightValue != null && leftValue !== rightValue) return field;
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');
  if (dryRun === apply) throw new Error('Użyj dokładnie jednego trybu: --dry-run albo --apply.');

  const rows = await loadIngredients();
  const aliases = rows
    .map((row) => ({ row, canonicalName: confirmedIngredientAlias(row.name) }))
    .filter((item): item is { row: IngredientRow; canonicalName: string } => Boolean(item.canonicalName));
  const suspicious = rows.filter((row) => isSuspiciousIngredientName(row.name));

  console.log(`Składników: ${rows.length}`);
  console.log(`Potwierdzonych aliasów: ${aliases.length}`);
  for (const { row, canonicalName } of aliases) {
    console.log(`ALIAS\t${JSON.stringify(row.name)}\t→\t${JSON.stringify(canonicalName)}\t${row.recipeIngredients.length} powiązań`);
    const canonical = rows.find((candidate) => candidate.name === canonicalName && candidate.id !== row.id);
    if (canonical) {
      const conflict = metadataConflict(row, canonical);
      if (conflict) console.log(`  KONFLIKT ${conflict}: ${row.name} vs ${canonical.name}`);
      for (const link of row.recipeIngredients) {
        const duplicate = canonical.recipeIngredients.find((candidate) => candidate.recipeId === link.recipeId);
        if (duplicate && duplicate.scalesLinearly !== link.scalesLinearly) {
          console.log(`  KONFLIKT scaling: ${link.recipe.name}`);
        }
      }
    }
  }
  if (suspicious.length) {
    console.log('\nPodejrzane nazwy (powiązane przepisy zostaną oznaczone jako wymagające uzupełnienia):');
    for (const row of suspicious) {
      console.log(`SUSPICIOUS\t${JSON.stringify(row.name)}\t${row.recipeIngredients.length} powiązań`);
    }
  }
  if (dryRun) return;

  const suspiciousRecipeIds = [...new Set(suspicious.flatMap((row) => row.recipeIngredients.map((link) => link.recipeId)))];
  await prisma.$transaction(async (tx) => {
    for (const { row, canonicalName } of aliases) {
      const current = await tx.ingredient.findUnique({
        where: { id: row.id },
        select: { id: true, name: true, category: true, packageSizeG: true, packageUnit: true, packageLabel: true, pieceWeightG: true },
      });
      if (!current) continue;
      const canonical = await tx.ingredient.findUnique({
        where: { name: canonicalName },
        select: { id: true, name: true, category: true, packageSizeG: true, packageUnit: true, packageLabel: true, pieceWeightG: true },
      });
      if (!canonical || canonical.id === current.id) {
        await tx.ingredient.update({ where: { id: current.id }, data: { name: normalizeIngredientName(current.name) } });
        continue;
      }
      const conflict = metadataConflict(current as IngredientRow, canonical as IngredientRow);
      if (conflict) throw new Error(`Konflikt ${conflict} dla aliasu ${current.name} → ${canonical.name}`);

      const links = await tx.recipeIngredient.findMany({
        where: { ingredientId: current.id },
        select: { id: true, recipeId: true, amountG: true, displayText: true, scalesLinearly: true },
      });
      for (const link of links) {
        const duplicate = await tx.recipeIngredient.findFirst({
          where: { recipeId: link.recipeId, ingredientId: canonical.id },
          select: { id: true, amountG: true, displayText: true, scalesLinearly: true },
        });
        if (duplicate) {
          if (duplicate.scalesLinearly !== link.scalesLinearly) {
            throw new Error(`Konflikt skalowania składnika ${current.name} w przepisie ${link.recipeId}`);
          }
          await tx.recipeIngredient.update({
            where: { id: duplicate.id },
            data: {
              amountG: duplicate.amountG + link.amountG,
              displayText: duplicate.displayText ?? link.displayText,
            },
          });
          await tx.recipeIngredient.delete({ where: { id: link.id } });
        } else {
          await tx.recipeIngredient.update({ where: { id: link.id }, data: { ingredientId: canonical.id } });
        }
      }
      await tx.ingredient.delete({ where: { id: current.id } });
    }
    if (suspiciousRecipeIds.length) {
      await tx.recipe.updateMany({ where: { id: { in: suspiciousRecipeIds } }, data: { nutritionReady: false } });
    }
  });
  console.log(`Zastosowano ${aliases.length} aliasów; oznaczono ${suspiciousRecipeIds.length} przepisów.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
