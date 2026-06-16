/**
 * Seeds the database from parsed diet files and curated recipe add-ons.
 * Safe to run multiple times (upserts, not duplicates).
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const CURATED_RECIPE_FILES = [
  'mediterranean-microbiome-recipes.json',
  'breakfast-recipes.json',
  'ocr-diety-recipes.json',
];
const VARIANT_FILE = 'recipe-calorie-variants-2500.json';
const COMPONENT_FILE = 'recipe-components.json';
const OCR_SOURCE_PREFIX = 'OCR Import';
const RECIPE_NAME_ALLOWLIST = new Set([
  'Gruszka, orzechy',
  'Jabłko, orzechy',
]);
const RECIPE_NAME_BLOCKLIST = new Set([
  'pietruszki ryzem',
  'NI RZVWYUNUMIIEIE i reel',
  'kokosowym z ryżem',
  'gotowanymi warzywami',
  'NRUTEZGR VV SUSIC PUIIUMUTUVYUTRURUSUW ylII z ryżem',
  'NIMYRZEICTOVYY E KALALAIIII i KITYRUTOAITII',
  'ryżową',
  'brokułami',
  'MMVIII GEE 2 AUIITUSQ IyUVvvQ',
  'korzeniowymi i ryżem',
  'korzeniowymi i ryżem (2)',
  'k EMW 4 Indyk z pieczonym batatem i kalarepą',
  'ziemniakami',
  'cukinią i marchewką',
  'Wołowina w sosie jogurtowo',
  'RUTESYZARTET i PAL ylIGQ',
]);

type SeedIngredient = {
  name: string;
  amountG: number;
  displayText?: string;
  category?: string;
};

type RecipeRef = {
  name: string;
  sourceDiet?: string | null;
  variantKey?: string | null;
};

type SeedRecipe = {
  name: string;
  type: string;
  role?: string;
  variantKey?: string;
  adjustmentNote?: string | null;
  variantOf?: RecipeRef | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  batchFriendly?: boolean;
  maxStorageDays?: number;
  kcalPerServing?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  instructions?: string[];
  sourceDiet?: string | null;
  tags?: string[];
  baseServings?: number;
  ingredientBasis?: string;
  source?: string;
  nutritionVerified?: boolean;
  ingredients: SeedIngredient[];
};

type VariantAddition = {
  name: string;
  amountG: number;
  note?: string;
};

type VariantEntry = {
  parentRecipe: RecipeRef;
  variantKey?: string;
  kcalPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG?: number | null;
  additions: VariantAddition[];
  note?: string;
};

type ComponentEntry = {
  parentRecipe: RecipeRef;
  componentRecipe: RecipeRef;
  usage?: string;
  note?: string;
};

type ValidatedRecipe = {
  recipe: SeedRecipe;
  warnings: string[];
};

// Known package sizes for waste-prevention feature
const PACKAGE_SIZES: Record<string, { sizeG: number; unit: string; label: string; pieceWeightG?: number }> = {
  'jajko': { sizeG: 600, unit: 'pack', label: 'karton 10 szt.', pieceWeightG: 60 },
  'mleczko kokosowe': { sizeG: 400, unit: 'can', label: 'puszka 400ml' },
  'napój kokosowy': { sizeG: 1000, unit: 'carton', label: 'karton 1L' },
  'jogurt kokosowy': { sizeG: 125, unit: 'pot', label: 'kubek 125g' },
  'kefir': { sizeG: 1000, unit: 'bottle', label: 'butelka 1L' },
  'skyr naturalny': { sizeG: 150, unit: 'pot', label: 'kubek 150g' },
  'ser mozzarella': { sizeG: 125, unit: 'pack', label: 'opakowanie 125g' },
  'masło migdałowe': { sizeG: 900, unit: 'jar', label: 'słoik 900g' },
  'ser feta': { sizeG: 200, unit: 'pack', label: 'opakowanie 200g' },
  'pierś z kurczaka': { sizeG: 500, unit: 'pack', label: 'opakowanie 500g' },
  'pierś z indyka': { sizeG: 500, unit: 'pack', label: 'opakowanie 500g' },
  'mięso mielone': { sizeG: 500, unit: 'pack', label: 'opakowanie 500g' },
  'łosoś atlantycki': { sizeG: 300, unit: 'pack', label: 'opakowanie 300g' },
  'łosoś wędzony': { sizeG: 100, unit: 'pack', label: 'opakowanie 100g' },
  'dorsz': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'sardynki': { sizeG: 120, unit: 'can', label: 'puszka 120g' },
  'tuńczyk': { sizeG: 170, unit: 'can', label: 'puszka 170g' },
  'krewetki': { sizeG: 300, unit: 'pack', label: 'opakowanie 300g' },
  'pomidor': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 150 },
  'ogórek świeży': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 180 },
  'papryka czerwona': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 200 },
  'cukinia': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 300 },
  'bakłażan': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 200 },
  'marchew': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 45 },
  'ziemniak': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 75 },
  'batat': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 240 },
  'burak': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 100 },
  'por': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 140 },
  'kalarepa': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 160 },
  'pietruszka (korzeń)': { sizeG: 1000, unit: 'kg', label: '1 kg', pieceWeightG: 80 },
  'brokuł': { sizeG: 500, unit: 'piece', label: '1 sztuka', pieceWeightG: 500 },
  'awokado': { sizeG: 140, unit: 'piece', label: '1 sztuka', pieceWeightG: 140 },
  'banan': { sizeG: 120, unit: 'piece', label: '1 sztuka', pieceWeightG: 120 },
  'jabłko': { sizeG: 150, unit: 'piece', label: '1 sztuka', pieceWeightG: 150 },
  'kiwi': { sizeG: 75, unit: 'piece', label: '1 sztuka', pieceWeightG: 75 },
  'brzoskwinia': { sizeG: 85, unit: 'piece', label: '1 sztuka', pieceWeightG: 85 },
  'pomarańcza': { sizeG: 240, unit: 'piece', label: '1 sztuka', pieceWeightG: 240 },
  'tortilla placek': { sizeG: 360, unit: 'pack', label: 'opakowanie 6 szt.', pieceWeightG: 60 },
  'chleb żytni': { sizeG: 500, unit: 'loaf', label: 'bochenek 500g', pieceWeightG: 38 },
  'rukola': { sizeG: 100, unit: 'bag', label: 'opakowanie 100g' },
  'roszponka': { sizeG: 100, unit: 'bag', label: 'opakowanie 100g' },
  'szpinak': { sizeG: 200, unit: 'bag', label: 'opakowanie 200g' },
  'kasza gryczana': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'kasza jaglana': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'komosa ryżowa': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'makaron gryczany': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'ryż': { sizeG: 500, unit: 'pack', label: 'opakowanie 500g' },
  'płatki owsiane': { sizeG: 500, unit: 'pack', label: 'opakowanie 500g' },
  'kasza pęczak': { sizeG: 400, unit: 'pack', label: 'opakowanie 400g' },
  'pestki dyni': { sizeG: 100, unit: 'bag', label: 'opakowanie 100g' },
  'pestki słonecznika': { sizeG: 200, unit: 'bag', label: 'opakowanie 200g' },
  'orzechy włoskie': { sizeG: 200, unit: 'bag', label: 'opakowanie 200g' },
  'nasiona chia': { sizeG: 200, unit: 'bag', label: 'opakowanie 200g' },
  'passata': { sizeG: 700, unit: 'bottle', label: 'butelka 700g' },
  'ciecierzyca': { sizeG: 400, unit: 'can', label: 'puszka 400g' },
  'fasola': { sizeG: 400, unit: 'can', label: 'puszka 400g' },
  'pomidory z puszki': { sizeG: 400, unit: 'can', label: 'puszka 400g' },
  'soczewica z puszki': { sizeG: 400, unit: 'can', label: 'puszka 400g' },
  'bulion warzywny': { sizeG: 500, unit: 'carton', label: 'karton 500ml' },
  'ogórek kiszony': { sizeG: 500, unit: 'jar', label: 'słoik 500g' },
  'kapusta kiszona': { sizeG: 500, unit: 'bag', label: 'opakowanie 500g' },
  'olej kokosowy': { sizeG: 450, unit: 'jar', label: 'słoik 450g' },
};

const NON_LINEAR_KEYWORDS = [
  'olej', 'oliwa', 'masło klarowane', 'sól', 'pieprz', 'zioła prowansalskie',
  'bazylia suszona', 'oregano', 'cynamon', 'kurkuma', 'imbir', 'czarnuszka',
  'tymianek', 'kolendra', 'papryka słodka',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetables: [
    'pomidor', 'ogórek', 'papryka', 'cukinia', 'bakłażan', 'szpinak', 'rukola', 'roszponka',
    'marchew', 'batat', 'ziemniak', 'burak', 'sałata', 'salata', 'kiełki', 'kalarepa', 'brokuł',
    'brokul', 'natka', 'koperek', 'bazylia świeża', 'pomidory koktajlowe',
  ],
  fruits: ['banan', 'jabł', 'jabl', 'borów', 'borow', 'malin', 'kiwi', 'pomarań', 'pomarancz', 'awokado'],
  grains: ['chleb', 'płatki', 'platki', 'kasza', 'ryż', 'ryz', 'makaron', 'tortilla', 'mąka', 'maka', 'komosa'],
  protein: ['kurczak', 'indyk', 'łosoś', 'losos', 'dorsz', 'tuńczyk', 'tunczyk', 'jajko', 'woł', 'wol', 'ciecierzyc', 'fasol', 'soczewic'],
  dairy: ['jogurt', 'twaróg', 'twarog', 'skyr', 'ser ', 'ser feta', 'mozzarella', 'kefir'],
  oils: ['olej', 'oliwa', 'masło', 'maslo', 'pesto'],
  nuts: ['orzech', 'pestki', 'chia', 'tahini', 'migdał', 'migdal', 'wiórki kokosowe', 'wiorki kokosowe'],
  spices: ['sól', 'sol', 'pieprz', 'kumin', 'oregano', 'tymianek', 'kolendra', 'cynamon', 'kardamon', 'chrzan'],
};

function recipeLookupKey(ref: RecipeRef | Pick<SeedRecipe, 'name' | 'sourceDiet' | 'variantKey'>) {
  return JSON.stringify({
    name: ref.name,
    sourceDiet: ref.sourceDiet ?? null,
    variantKey: ref.variantKey ?? 'base',
  });
}

function scalesLinearly(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase();
  return !NON_LINEAR_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function inferCategory(name: string) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'other';
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
    packageSizeG: pkg?.sizeG ?? null,
    packageUnit: pkg?.unit ?? null,
    packageLabel: pkg?.label ?? null,
    pieceWeightG: pkg?.pieceWeightG ?? null,
  };
}

function loadJson<T>(filename: string): T | null {
  const filePath = path.join(__dirname, '../data/curated', filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function hasLetters(value: string) {
  return /[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/.test(value);
}

function isOcrSource(sourceDiet?: string | null) {
  return (sourceDiet ?? '').startsWith(OCR_SOURCE_PREFIX);
}

function isInvalidIngredientName(name: string) {
  const normalized = normalizeWhitespace(name);
  if (!normalized) return true;
  if (!hasLetters(normalized)) return true;
  if (/^screenshot\b/i.test(normalized)) return true;
  if (/^[\d.,/%() -]+(?:g|kg|ml|l)?$/i.test(normalized)) return true;
  return false;
}

function hasTooManyUppercaseGlyphs(name: string) {
  const letters = name.match(/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g) ?? [];
  if (letters.length < 8) return false;
  const uppercase = name.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) ?? [];
  return uppercase.length / letters.length > 0.45;
}

function hasWeirdOcrToken(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, ''))
    .filter((word) => word.length >= 4)
    .some((word) => !/[aeiouyąęó]/i.test(word));
}

function isLikelyCorruptedRecipeName(name: string) {
  const normalized = normalizeWhitespace(name);
  if (!normalized) return true;
  if (RECIPE_NAME_ALLOWLIST.has(normalized)) return false;
  if (RECIPE_NAME_BLOCKLIST.has(normalized)) return true;
  if (/^screenshot\b/i.test(normalized)) return true;
  if (!hasLetters(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (/^[a-ząćęłńóśźż]/.test(normalized) && !normalized.includes(',') && words.length <= 4) {
    return true;
  }
  if (hasTooManyUppercaseGlyphs(normalized)) return true;
  if (hasWeirdOcrToken(normalized)) return true;

  return false;
}

function sanitizeRecipe(recipe: SeedRecipe): ValidatedRecipe | null {
  const normalizedName = normalizeWhitespace(recipe.name);
  const normalizedIngredients = recipe.ingredients
    .map((ingredient) => ({
      ...ingredient,
      name: normalizeWhitespace(ingredient.name),
      displayText: ingredient.displayText ? normalizeWhitespace(ingredient.displayText) : undefined,
      category: ingredient.category ? normalizeWhitespace(ingredient.category) : undefined,
    }))
    .filter((ingredient) => ingredient.amountG > 0 && !isInvalidIngredientName(ingredient.name));
  const normalizedInstructions = (recipe.instructions ?? [])
    .map((instruction) => normalizeWhitespace(instruction))
    .filter(Boolean);
  const normalizedTags = (recipe.tags ?? [])
    .map((tag) => normalizeWhitespace(tag))
    .filter(Boolean);

  if (!normalizedName) return null;
  if (isOcrSource(recipe.sourceDiet) && isLikelyCorruptedRecipeName(normalizedName)) return null;
  if (normalizedIngredients.length === 0) return null;

  const warnings: string[] = [];
  if (normalizedIngredients.length !== recipe.ingredients.length) {
    warnings.push(`filtered ${recipe.ingredients.length - normalizedIngredients.length} invalid ingredient(s)`);
  }

  return {
    recipe: {
      ...recipe,
      name: normalizedName,
      instructions: normalizedInstructions,
      tags: normalizedTags,
      ingredients: normalizedIngredients,
    },
    warnings,
  };
}

function mergeIngredients(ingredients: SeedIngredient[]) {
  const merged = new Map<string, SeedIngredient>();
  for (const ingredient of ingredients) {
    const existing = merged.get(ingredient.name);
    if (existing) {
      existing.amountG += ingredient.amountG;
      if (!existing.displayText && ingredient.displayText) existing.displayText = ingredient.displayText;
      if (!existing.category && ingredient.category) existing.category = ingredient.category;
    } else {
      merged.set(ingredient.name, { ...ingredient });
    }
  }
  return [...merged.values()];
}

function buildVariantRecipes(
  baseRecipes: SeedRecipe[],
  variants: VariantEntry[],
): SeedRecipe[] {
  const baseMap = new Map(baseRecipes.map((recipe) => [recipeLookupKey(recipe), recipe]));

  return variants.flatMap((variant) => {
    const parent = baseMap.get(recipeLookupKey(variant.parentRecipe));
    if (!parent) {
      console.warn(`⚠️ Missing parent recipe for variant: ${variant.parentRecipe.name}`);
      return [];
    }

    const additions: SeedIngredient[] = variant.additions.map((addition) => ({
      name: addition.name,
      amountG: addition.amountG,
      displayText: addition.note,
      category: inferCategory(addition.name),
    }));

    const tags = new Set([...(parent.tags ?? []), `variant:${variant.variantKey ?? 'kcal-2500'}`]);

    return [{
      ...parent,
      role: 'meal',
      variantKey: variant.variantKey ?? 'kcal-2500',
      adjustmentNote: variant.note ?? null,
      variantOf: {
        name: parent.name,
        sourceDiet: parent.sourceDiet ?? null,
        variantKey: 'base',
      },
      kcalPerServing: variant.kcalPerServing,
      proteinG: variant.proteinG,
      carbsG: variant.carbsG,
      fatG: variant.fatG,
      fiberG: variant.fiberG ?? null,
      tags: [...tags],
      ingredients: mergeIngredients([
        ...parent.ingredients.map((ingredient) => ({ ...ingredient })),
        ...additions,
      ]),
    }];
  });
}

async function main() {
  const combinedPath = path.join(__dirname, '../data/parsed/combined.json');
  if (!fs.existsSync(combinedPath)) {
    throw new Error(`combined.json not found. Run 'npm run parse:diets' first.`);
  }

  const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf-8')) as { recipes: SeedRecipe[] };
  const curatedRecipes = CURATED_RECIPE_FILES.flatMap((filename) => {
    const curated = loadJson<{ recipes?: SeedRecipe[] }>(filename);
    return curated?.recipes ?? [];
  });
  const variantConfig = loadJson<{ recipes?: VariantEntry[] }>(VARIANT_FILE);
  const componentConfig = loadJson<{ components?: ComponentEntry[] }>(COMPONENT_FILE);
  const variantRecipes = buildVariantRecipes(
    [...combined.recipes, ...curatedRecipes],
    variantConfig?.recipes ?? [],
  );
  const rawRecipes = [
    ...combined.recipes,
    ...curatedRecipes,
    ...variantRecipes,
  ];
  const invalidRecipes: RecipeRef[] = [];
  const recipes = rawRecipes.flatMap((recipe) => {
    const validated = sanitizeRecipe(recipe);
    if (!validated) {
      invalidRecipes.push({
        name: recipe.name,
        sourceDiet: recipe.sourceDiet ?? null,
        variantKey: recipe.variantKey ?? 'base',
      });
      console.warn(`⚠️ Skipping suspicious recipe: ${recipe.name} [${recipe.sourceDiet ?? 'no-source'}]`);
      return [];
    }

    for (const warning of validated.warnings) {
      console.warn(`⚠️ ${validated.recipe.name}: ${warning}`);
    }

    return [validated.recipe];
  });

  console.log(`\n🌱 Seeding ${recipes.length} recipes into database...\n`);

  let ingredientCount = 0;
  let recipeCount = 0;
  const recipeIds = new Map<string, string>();

  for (const invalidRecipe of invalidRecipes) {
    try {
      await prisma.recipe.deleteMany({
        where: {
          name: invalidRecipe.name,
          sourceDiet: invalidRecipe.sourceDiet ?? null,
          variantKey: invalidRecipe.variantKey ?? 'base',
          mealPlanMeals: {
            none: {},
          },
        },
      });
    } catch (error: any) {
      console.warn(`⚠️ Could not remove stale invalid recipe ${invalidRecipe.name}: ${error.message}`);
    }
  }

  for (const recipe of recipes) {
    const ingredientIds: Record<string, string> = {};

    for (const ingredient of recipe.ingredients) {
      const pkg = getPackageInfo(ingredient.name);
      const pkgData = buildPackageData(pkg);
      const record = await prisma.ingredient.upsert({
        where: { name: ingredient.name },
        update: pkgData,
        create: {
          name: ingredient.name,
          category: ingredient.category || inferCategory(ingredient.name),
          ...pkgData,
        },
      });

      ingredientIds[ingredient.name] = record.id;
      ingredientCount += 1;
    }

    try {
      const existing = await prisma.recipe.findFirst({
        where: {
          name: recipe.name,
          sourceDiet: recipe.sourceDiet ?? null,
          variantKey: recipe.variantKey ?? 'base',
        },
      });

      const data = {
        type: recipe.type,
        role: recipe.role ?? 'meal',
        variantKey: recipe.variantKey ?? 'base',
        adjustmentNote: recipe.adjustmentNote ?? null,
        prepTimeMin: recipe.prepTimeMin ?? null,
        cookTimeMin: recipe.cookTimeMin ?? null,
        batchFriendly: recipe.batchFriendly ?? false,
        maxStorageDays: recipe.maxStorageDays ?? 1,
        kcalPerServing: recipe.kcalPerServing ?? null,
        proteinG: recipe.proteinG ?? null,
        carbsG: recipe.carbsG ?? null,
        fatG: recipe.fatG ?? null,
        fiberG: recipe.fiberG ?? null,
        instructions: JSON.stringify(recipe.instructions || []),
        sourceDiet: recipe.sourceDiet ?? null,
        tags: JSON.stringify(recipe.tags || []),
        baseServings: recipe.baseServings ?? 1,
        ingredientBasis: recipe.ingredientBasis ?? 'per-serving',
        source: recipe.source ?? 'dietitian',
        nutritionVerified: recipe.nutritionVerified ?? true,
        variantOfId: null,
      };

      const dbRecipe = existing
        ? await prisma.recipe.update({
            where: { id: existing.id },
            data,
          })
        : await prisma.recipe.create({
            data: {
              name: recipe.name,
              ...data,
            },
          });

      await prisma.recipeIngredient.deleteMany({ where: { recipeId: dbRecipe.id } });
      for (const ingredient of recipe.ingredients) {
        const ingredientId = ingredientIds[ingredient.name];
        if (!ingredientId) continue;

        await prisma.recipeIngredient.create({
          data: {
            recipeId: dbRecipe.id,
            ingredientId,
            amountG: ingredient.amountG,
            displayText: ingredient.displayText ?? null,
            scalesLinearly: scalesLinearly(ingredient.name),
          },
        });
      }

      recipeIds.set(recipeLookupKey(recipe), dbRecipe.id);
      recipeCount += 1;
      console.log(`✅ [${recipe.type}] ${recipe.name} (${recipe.variantKey ?? 'base'})`);
    } catch (error: any) {
      console.error(`❌ Failed: ${recipe.name} — ${error.message}`);
    }
  }

  for (const recipe of recipes) {
    if (!recipe.variantOf) continue;
    const childId = recipeIds.get(recipeLookupKey(recipe));
    const parentId = recipeIds.get(recipeLookupKey(recipe.variantOf));
    if (!childId || !parentId) continue;
    await prisma.recipe.update({
      where: { id: childId },
      data: { variantOfId: parentId },
    });
  }

  await prisma.recipeComponent.deleteMany();
  for (const link of componentConfig?.components ?? []) {
    const parentId = recipeIds.get(recipeLookupKey({
      name: link.parentRecipe.name,
      sourceDiet: link.parentRecipe.sourceDiet ?? null,
      variantKey: 'base',
    }));
    const componentId = recipeIds.get(recipeLookupKey({
      name: link.componentRecipe.name,
      sourceDiet: link.componentRecipe.sourceDiet ?? null,
      variantKey: 'base',
    }));

    if (!parentId || !componentId) {
      console.warn(`⚠️ Component link skipped: ${link.parentRecipe.name} -> ${link.componentRecipe.name}`);
      continue;
    }

    await prisma.recipeComponent.create({
      data: {
        parentRecipeId: parentId,
        componentRecipeId: componentId,
        servingsUsed: 1,
        displayText: link.usage ?? null,
        note: link.note ?? null,
      },
    });
  }

  console.log(`\n🎉 Done! ${recipeCount} recipes, ${ingredientCount} ingredient links seeded.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
