/**
 * Seeds the database from parsed diet files and curated recipe add-ons.
 * Safe to run multiple times (upserts, not duplicates).
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const CURATED_RECIPE_FILES = [
  "mediterranean-microbiome-recipes.json",
  "breakfast-recipes.json",
];

// Known package sizes for waste-prevention feature
// pieceWeightG: set for count-based items (e.g. egg=60g) → display in pieces, not grams
const PACKAGE_SIZES: Record<string, { sizeG: number; unit: string; label: string; pieceWeightG?: number }> = {
  // ── Nabiał i jaja ──────────────────────────────────────────────────────────
  "jajko":               { sizeG: 600, unit: "pack",    label: "karton 10 szt.", pieceWeightG: 60 },
  "mleczko kokosowe":    { sizeG: 400, unit: "can",     label: "puszka 400ml" },
  "napój kokosowy":      { sizeG: 1000, unit: "carton", label: "karton 1L" },
  "jogurt kokosowy":     { sizeG: 125, unit: "pot",     label: "kubek 125g" },
  "kefir":               { sizeG: 1000, unit: "bottle",  label: "butelka 1L" },
  "skyr naturalny":      { sizeG: 150, unit: "pot",     label: "kubek 150g" },
  "ser mozzarella":      { sizeG: 125, unit: "pack",    label: "opakowanie 125g" },
  "masło migdałowe":     { sizeG: 900, unit: "jar",     label: "słoik 900g" },
  "ser feta":            { sizeG: 200, unit: "pack",    label: "opakowanie 200g" },
  // ── Białko ────────────────────────────────────────────────────────────────
  "pierś z kurczaka":    { sizeG: 500, unit: "pack",    label: "opakowanie 500g" },
  "pierś z indyka":      { sizeG: 500, unit: "pack",    label: "opakowanie 500g" },
  "mięso mielone":       { sizeG: 500, unit: "pack",    label: "opakowanie 500g" },
  "łosoś atlantycki":    { sizeG: 300, unit: "pack",    label: "opakowanie 300g" },
  "łosoś wędzony":       { sizeG: 100, unit: "pack",    label: "opakowanie 100g" },
  "dorsz":               { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  "sardynki":            { sizeG: 120, unit: "can",     label: "puszka 120g" },
  "tuńczyk":             { sizeG: 170, unit: "can",     label: "puszka 170g" },
  "krewetki":            { sizeG: 300, unit: "pack",    label: "opakowanie 300g" },
  // ── Warzywa na sztuki ─────────────────────────────────────────────────────
  "pomidor":             { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 150 },
  "ogórek świeży":       { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 180 },
  "papryka czerwona":    { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 200 },
  "cukinia":             { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 300 },
  "bakłażan":            { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 200 },
  "marchew":             { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 45 },
  "ziemniak":            { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 75 },
  "batat":               { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 240 },
  "burak":               { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 100 },
  "por":                 { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 140 },
  "kalarepa":            { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 160 },
  "pietruszka (korzeń)": { sizeG: 1000, unit: "kg",     label: "1 kg",           pieceWeightG: 80 },
  "brokuł":              { sizeG: 500,  unit: "piece",  label: "1 sztuka",       pieceWeightG: 500 },
  // ── Owoce na sztuki ───────────────────────────────────────────────────────
  "awokado":             { sizeG: 140,  unit: "piece",  label: "1 sztuka",       pieceWeightG: 140 },
  "banan":               { sizeG: 120,  unit: "piece",  label: "1 sztuka",       pieceWeightG: 120 },
  "jabłko":              { sizeG: 150,  unit: "piece",  label: "1 sztuka",       pieceWeightG: 150 },
  "kiwi":                { sizeG: 75,   unit: "piece",  label: "1 sztuka",       pieceWeightG: 75 },
  "brzoskwinia":         { sizeG: 85,   unit: "piece",  label: "1 sztuka",       pieceWeightG: 85 },
  "pomarańcza":          { sizeG: 240,  unit: "piece",  label: "1 sztuka",       pieceWeightG: 240 },
  // ── Inne na sztuki ────────────────────────────────────────────────────────
  "tortilla placek":     { sizeG: 360,  unit: "pack",   label: "opakowanie 6 szt.", pieceWeightG: 60 },
  "chleb żytni":         { sizeG: 500,  unit: "loaf",   label: "bochenek 500g",  pieceWeightG: 38 },
  // ── Warzywa pakowane ──────────────────────────────────────────────────────
  "rukola":              { sizeG: 100, unit: "bag",     label: "opakowanie 100g" },
  "roszponka":           { sizeG: 100, unit: "bag",     label: "opakowanie 100g" },
  "szpinak":             { sizeG: 200, unit: "bag",     label: "opakowanie 200g" },
  // ── Zboża i kasze ─────────────────────────────────────────────────────────
  "kasza gryczana":      { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  "kasza jaglana":       { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  "komosa ryżowa":       { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  "makaron gryczany":    { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  "ryż":                 { sizeG: 500, unit: "pack",    label: "opakowanie 500g" },
  "płatki owsiane":      { sizeG: 500, unit: "pack",    label: "opakowanie 500g" },
  "kasza pęczak":        { sizeG: 400, unit: "pack",    label: "opakowanie 400g" },
  // ── Orzechy i pestki ──────────────────────────────────────────────────────
  "pestki dyni":         { sizeG: 100, unit: "bag",     label: "opakowanie 100g" },
  "pestki słonecznika":  { sizeG: 200, unit: "bag",     label: "opakowanie 200g" },
  "orzechy włoskie":     { sizeG: 200, unit: "bag",     label: "opakowanie 200g" },
  "nasiona chia":        { sizeG: 200, unit: "bag",     label: "opakowanie 200g" },
  // ── Puszki i butelki ──────────────────────────────────────────────────────
  "passata":             { sizeG: 700, unit: "bottle",  label: "butelka 700g" },
  "ciecierzyca":         { sizeG: 400, unit: "can",     label: "puszka 400g" },
  "fasola":              { sizeG: 400, unit: "can",     label: "puszka 400g" },
  "pomidory z puszki":   { sizeG: 400, unit: "can",     label: "puszka 400g" },
  "soczewica z puszki":  { sizeG: 400, unit: "can",     label: "puszka 400g" },
  "bulion warzywny":     { sizeG: 500, unit: "carton",  label: "karton 500ml" },
  "ogórek kiszony":      { sizeG: 500, unit: "jar",     label: "słoik 500g" },
  "kapusta kiszona":     { sizeG: 500, unit: "bag",     label: "opakowanie 500g" },
  // ── Słoiki ────────────────────────────────────────────────────────────────
  "olej kokosowy":       { sizeG: 450, unit: "jar",     label: "słoik 450g" },
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

function buildPackageData(pkg: ReturnType<typeof getPackageInfo>) {
  return {
    packageSizeG:  pkg?.sizeG      ?? null,
    packageUnit:   pkg?.unit       ?? null,
    packageLabel:  pkg?.label      ?? null,
    pieceWeightG:  pkg?.pieceWeightG ?? null,
  };
}

async function main() {
  const combinedPath = path.join(__dirname, "../data/parsed/combined.json");
  if (!fs.existsSync(combinedPath)) {
    throw new Error(`combined.json not found. Run 'npm run parse:diets' first.`);
  }

  const combined = JSON.parse(fs.readFileSync(combinedPath, "utf-8"));
  const curatedRecipes = CURATED_RECIPE_FILES.flatMap((filename) => {
    const curatedPath = path.join(__dirname, "../data/curated", filename);
    if (!fs.existsSync(curatedPath)) return [];
    const curated = JSON.parse(fs.readFileSync(curatedPath, "utf-8"));
    return (curated.recipes ?? []) as any[];
  });
  const recipes = [
    ...(combined.recipes as any[]),
    ...curatedRecipes,
  ];

  console.log(`\n🌱 Seeding ${recipes.length} recipes into database...\n`);

  let ingredientCount = 0;
  let recipeCount = 0;

  for (const recipe of recipes) {
    // Upsert each ingredient first
    const ingredientIds: Record<string, string> = {};

    for (const ing of recipe.ingredients) {
      const pkg = getPackageInfo(ing.name);

      const pkgData = buildPackageData(pkg);
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        update: pkgData,
        create: {
          name: ing.name,
          category: ing.category || "other",
          ...pkgData,
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
            prepTimeMin: recipe.prepTimeMin ?? null,
            cookTimeMin: recipe.cookTimeMin ?? null,
            batchFriendly: recipe.batchFriendly,
            maxStorageDays: recipe.maxStorageDays,
            kcalPerServing: recipe.kcalPerServing,
            proteinG: recipe.proteinG,
            carbsG: recipe.carbsG,
            fatG: recipe.fatG,
            fiberG: recipe.fiberG,
            instructions: JSON.stringify(recipe.instructions || []),
            sourceDiet: recipe.sourceDiet,
            tags: JSON.stringify(recipe.tags || []),
            baseServings: recipe.baseServings ?? 1,
            ingredientBasis: recipe.ingredientBasis ?? "per-serving",
            source: recipe.source ?? "dietitian",
            nutritionVerified: recipe.nutritionVerified ?? true,
          },
        });
        // Remove old ingredient links
        await prisma.recipeIngredient.deleteMany({ where: { recipeId: dbRecipe.id } });
      } else {
        dbRecipe = await prisma.recipe.create({
          data: {
            name: recipe.name,
            type: recipe.type,
            prepTimeMin: recipe.prepTimeMin ?? null,
            cookTimeMin: recipe.cookTimeMin ?? null,
            batchFriendly: recipe.batchFriendly,
            maxStorageDays: recipe.maxStorageDays,
            kcalPerServing: recipe.kcalPerServing,
            proteinG: recipe.proteinG,
            carbsG: recipe.carbsG,
            fatG: recipe.fatG,
            fiberG: recipe.fiberG,
            instructions: JSON.stringify(recipe.instructions || []),
            sourceDiet: recipe.sourceDiet,
            tags: JSON.stringify(recipe.tags || []),
            baseServings: recipe.baseServings ?? 1,
            ingredientBasis: recipe.ingredientBasis ?? "per-serving",
            source: recipe.source ?? "dietitian",
            nutritionVerified: recipe.nutritionVerified ?? true,
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
