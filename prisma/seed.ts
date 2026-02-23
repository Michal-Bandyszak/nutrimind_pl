/**
 * Seeds the database from data/parsed/combined.json
 * Safe to run multiple times (upserts, not duplicates).
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Known package sizes for waste-prevention feature
const PACKAGE_SIZES: Record<string, { sizeG: number; unit: string; label: string }> = {
  "mleczko kokosowe":      { sizeG: 400, unit: "can",    label: "puszka 400ml" },
  "napój kokosowy":        { sizeG: 1000, unit: "carton", label: "karton 1L" },
  "passata":               { sizeG: 700, unit: "bottle",  label: "butelka 700g" },
  "ciecierzyca":           { sizeG: 400, unit: "can",    label: "puszka 400g" },
  "fasola":                { sizeG: 400, unit: "can",    label: "puszka 400g" },
  "pomidory z puszki":     { sizeG: 400, unit: "can",    label: "puszka 400g" },
  "soczewica z puszki":    { sizeG: 400, unit: "can",    label: "puszka 400g" },
  "bulion warzywny":       { sizeG: 500, unit: "carton", label: "karton 500ml" },
  "jogurt kokosowy":       { sizeG: 125, unit: "pot",    label: "kubek 125g" },
  "skyr naturalny":        { sizeG: 150, unit: "pot",    label: "kubek 150g" },
  "ser mozzarella":        { sizeG: 125, unit: "pack",   label: "opakowanie 125g" },
  "masło migdałowe":       { sizeG: 200, unit: "jar",    label: "słoik 200g" },
};

// Non-linearly scaling ingredients (oils, spices)
const NON_LINEAR_KEYWORDS = [
  "olej", "oliwa", "masło klarowane", "sól", "pieprz", "zioła prowansalskie",
  "bazylia suszona", "oregano", "cynamon", "kurkuma", "imbir", "czarnuszka",
  "tymianek", "kolendra", "papryka słodka",
];

function scalesLinearly(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase();
  return !NON_LINEAR_KEYWORDS.some((kw) => lower.includes(kw));
}

function getPackageInfo(ingredientName: string) {
  const lower = ingredientName.toLowerCase();
  for (const [key, info] of Object.entries(PACKAGE_SIZES)) {
    if (lower.includes(key)) return info;
  }
  return null;
}

async function main() {
  const combinedPath = path.join(__dirname, "../data/parsed/combined.json");
  if (!fs.existsSync(combinedPath)) {
    throw new Error(`combined.json not found. Run 'npm run parse:diets' first.`);
  }

  const combined = JSON.parse(fs.readFileSync(combinedPath, "utf-8"));
  const recipes = combined.recipes as any[];

  console.log(`\n🌱 Seeding ${recipes.length} recipes into database...\n`);

  let ingredientCount = 0;
  let recipeCount = 0;

  for (const recipe of recipes) {
    // Upsert each ingredient first
    const ingredientIds: Record<string, string> = {};

    for (const ing of recipe.ingredients) {
      const pkg = getPackageInfo(ing.name);

      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        update: {},
        create: {
          name: ing.name,
          category: ing.category || "other",
          packageSizeG: pkg?.sizeG ?? null,
          packageUnit: pkg?.unit ?? null,
          packageLabel: pkg?.label ?? null,
        },
      });

      ingredientIds[ing.name] = ingredient.id;
      ingredientCount++;
    }

    // Upsert recipe — use name + sourceDiet as unique key
    try {
      const existing = await prisma.recipe.findFirst({
        where: { name: recipe.name, sourceDiet: recipe.sourceDiet },
      });

      let dbRecipe;
      if (existing) {
        // Update
        dbRecipe = await prisma.recipe.update({
          where: { id: existing.id },
          data: {
            type: recipe.type,
            batchFriendly: recipe.batchFriendly,
            maxStorageDays: recipe.maxStorageDays,
            kcalPerServing: recipe.kcalPerServing,
            proteinG: recipe.proteinG,
            carbsG: recipe.carbsG,
            fatG: recipe.fatG,
            fiberG: recipe.fiberG,
            instructions: JSON.stringify(recipe.instructions || []),
            sourceDiet: recipe.sourceDiet,
          },
        });
        // Remove old ingredient links
        await prisma.recipeIngredient.deleteMany({ where: { recipeId: dbRecipe.id } });
      } else {
        dbRecipe = await prisma.recipe.create({
          data: {
            name: recipe.name,
            type: recipe.type,
            batchFriendly: recipe.batchFriendly,
            maxStorageDays: recipe.maxStorageDays,
            kcalPerServing: recipe.kcalPerServing,
            proteinG: recipe.proteinG,
            carbsG: recipe.carbsG,
            fatG: recipe.fatG,
            fiberG: recipe.fiberG,
            instructions: JSON.stringify(recipe.instructions || []),
            sourceDiet: recipe.sourceDiet,
          },
        });
      }

      // Create ingredient links
      for (const ing of recipe.ingredients) {
        const ingredientId = ingredientIds[ing.name];
        if (!ingredientId) continue;

        await prisma.recipeIngredient.create({
          data: {
            recipeId: dbRecipe.id,
            ingredientId,
            amountG: ing.amountG,
            displayText: ing.displayText,
            scalesLinearly: scalesLinearly(ing.name),
          },
        });
      }

      recipeCount++;
      console.log(`✅ [${recipe.type}] ${recipe.name}`);
    } catch (err: any) {
      console.error(`❌ Failed: ${recipe.name} — ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! ${recipeCount} recipes, ${ingredientCount} ingredient links seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
