/**
 * Seeds the database from parsed diet files and curated recipe add-ons.
 * Safe to run multiple times (upserts, not duplicates).
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { isNutritionReady } from '../lib/utils/nutritionReady';

const prisma = new PrismaClient();
const CURATED_RECIPE_FILES = [
  'mediterranean-microbiome-recipes.json',
  'polish-balanced-recipes.json',
  'breakfast-recipes.json',
  'ocr-diety-recipes.json',
  'recovered-production-recipes.json',
];
const VARIANT_FILE = 'recipe-calorie-variants-2500.json';
const COMPONENT_FILE = 'recipe-components.json';
const OCR_SOURCE_PREFIXES = ['OCR Import', 'Import OCR', 'OCRDiety'];
const SOURCE_DIET_ALIASES: Record<string, string> = {
  'Zestaw sniadan A': 'Sniadania OCR 2026-06-13',
  'Plan bazowy C': 'NutriMind katalog bazowy',
};
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
const VALID_RECIPE_TYPES = new Set(['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert']);
const VALID_RECIPE_ROLES = new Set(['meal', 'component']);
const VALID_RECIPE_SOURCES = new Set(['dietitian', 'user', 'curated']);
const VALID_INGREDIENT_BASES = new Set(['per-serving', 'per-whole']);

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
  nutritionReady?: boolean;
  /** Legacy parser compatibility; never trusted as readiness. */
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
  ingredientsValid: boolean;
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
    sourceDiet: canonicalSourceDiet(ref.sourceDiet),
    variantKey: ref.variantKey ?? 'base',
  });
}

function canonicalSourceDiet(sourceDiet?: string | null) {
  if (!sourceDiet) return null;
  return SOURCE_DIET_ALIASES[sourceDiet] ?? sourceDiet;
}

function sourceDietCandidates(sourceDiet?: string | null) {
  const canonical = canonicalSourceDiet(sourceDiet);
  if (!canonical) return [];
  return [
    canonical,
    ...Object.entries(SOURCE_DIET_ALIASES)
      .filter(([, target]) => target === canonical)
      .map(([alias]) => alias),
  ];
}

function scalesLinearly(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase();
  return !NON_LINEAR_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function inferCategory(name: string) {
  const lower = name.toLowerCase();
  if (CATEGORY_KEYWORDS.oils.some((keyword) => lower.includes(keyword))) return 'oils';
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'oils') continue;
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'other';
}

function resolveCategory(ingredient: SeedIngredient) {
  const inferred = inferCategory(ingredient.name);
  return inferred === 'other' ? ingredient.category || 'other' : inferred;
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

function loadRequiredJson<T>(filename: string): T {
  const value = loadJson<T>(filename);
  if (!value) throw new Error(`Required curated file is missing: ${filename}`);
  return value;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function hasLetters(value: string) {
  return /[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/.test(value);
}

function isOcrSource(sourceDiet?: string | null) {
  return OCR_SOURCE_PREFIXES.some((prefix) => (sourceDiet ?? '').startsWith(prefix));
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

function assertSeedRecipeShape(recipe: SeedRecipe) {
  if (!recipe.name || typeof recipe.name !== 'string') throw new Error('Recipe name is required.');
  if (!VALID_RECIPE_TYPES.has(recipe.type)) throw new Error(`Invalid recipe type for ${recipe.name}: ${recipe.type}`);
  if (recipe.role && !VALID_RECIPE_ROLES.has(recipe.role)) throw new Error(`Invalid recipe role for ${recipe.name}: ${recipe.role}`);
  if (recipe.source && !VALID_RECIPE_SOURCES.has(recipe.source)) throw new Error(`Invalid recipe source for ${recipe.name}: ${recipe.source}`);
  if (recipe.ingredientBasis && !VALID_INGREDIENT_BASES.has(recipe.ingredientBasis)) {
    throw new Error(`Invalid ingredient basis for ${recipe.name}: ${recipe.ingredientBasis}`);
  }
  if (!Array.isArray(recipe.instructions)) throw new Error(`Instructions must be an array for ${recipe.name}`);
  if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) {
    throw new Error(`At least one ingredient is required for ${recipe.name}`);
  }
  for (const ingredient of recipe.ingredients) {
    if (!ingredient || typeof ingredient.name !== 'string') {
      throw new Error(`Ingredient name is invalid for ${recipe.name}`);
    }
    if (!Number.isFinite(ingredient.amountG) || ingredient.amountG <= 0) {
      throw new Error(`Ingredient amount is invalid for ${recipe.name}: ${ingredient.name}`);
    }
  }
  for (const field of ['kcalPerServing', 'proteinG', 'carbsG', 'fatG', 'fiberG'] as const) {
    const value = recipe[field];
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Macro ${field} is invalid for ${recipe.name}`);
    }
  }
}

function sanitizeRecipe(recipe: SeedRecipe): ValidatedRecipe | null {
  const normalizedName = normalizeWhitespace(recipe.name);
  const validIngredients = recipe.ingredients
    .map((ingredient) => ({
      ...ingredient,
      name: normalizeWhitespace(ingredient.name),
      displayText: ingredient.displayText ? normalizeWhitespace(ingredient.displayText) : undefined,
      category: ingredient.category ? normalizeWhitespace(ingredient.category) : undefined,
    }))
    .filter((ingredient) => ingredient.amountG > 0 && !isInvalidIngredientName(ingredient.name));
  const ingredientsValid = validIngredients.length === recipe.ingredients.length;
  const normalizedIngredients = mergeIngredients(validIngredients);
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
  if (!ingredientsValid) {
    warnings.push(`filtered ${recipe.ingredients.length - validIngredients.length} invalid ingredient(s)`);
  }
  if (normalizedIngredients.length !== validIngredients.length) {
    warnings.push(`merged ${validIngredients.length - normalizedIngredients.length} duplicate ingredient(s)`);
  }

  return {
    recipe: {
      ...recipe,
      name: normalizedName,
      sourceDiet: canonicalSourceDiet(recipe.sourceDiet),
      variantOf: recipe.variantOf ? {
        ...recipe.variantOf,
        sourceDiet: canonicalSourceDiet(recipe.variantOf.sourceDiet),
      } : recipe.variantOf,
      instructions: normalizedInstructions,
      tags: normalizedTags,
      ingredients: normalizedIngredients,
    },
    warnings,
    ingredientsValid,
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
      throw new Error(`Missing parent recipe for variant: ${variant.parentRecipe.name}`);
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
  const dryRun = process.argv.includes('--dry-run');
  const combinedPath = path.join(__dirname, '../data/parsed/combined.json');
  const combined = fs.existsSync(combinedPath)
    ? (JSON.parse(fs.readFileSync(combinedPath, 'utf-8')) as { recipes: SeedRecipe[] })
    : { recipes: [] };
  if (!fs.existsSync(combinedPath)) {
    console.warn('⚠️ combined.json not found. Seeding only tracked curated recipes.');
  }

  const curatedRecipes = CURATED_RECIPE_FILES.flatMap((filename) => {
    const curated = loadRequiredJson<{ recipes?: SeedRecipe[] }>(filename);
    return curated.recipes ?? [];
  });
  const variantConfig = loadRequiredJson<{ recipes?: VariantEntry[] }>(VARIANT_FILE);
  const componentConfig = loadRequiredJson<{ components?: ComponentEntry[] }>(COMPONENT_FILE);
  const baseRecipes = [...combined.recipes, ...curatedRecipes];
  const variantRecipes = buildVariantRecipes(baseRecipes, variantConfig.recipes ?? []);
  const rawRecipes = [...baseRecipes, ...variantRecipes];
  const invalidRecipes: RecipeRef[] = [];
  const validatedRecipes: { recipe: SeedRecipe; ingredientsValid: boolean }[] = [];

  for (const rawRecipe of rawRecipes) {
    assertSeedRecipeShape(rawRecipe);
    const validated = sanitizeRecipe(rawRecipe);
    if (!validated) {
      invalidRecipes.push({
        name: rawRecipe.name,
        sourceDiet: rawRecipe.sourceDiet ?? null,
        variantKey: rawRecipe.variantKey ?? 'base',
      });
      console.warn(`⚠️ Suspicious recipe excluded from managed catalog: ${rawRecipe.name} [${rawRecipe.sourceDiet ?? 'no-source'}]`);
      continue;
    }
    for (const warning of validated.warnings) {
      console.warn(`⚠️ ${validated.recipe.name}: ${warning}`);
    }
    validatedRecipes.push({ recipe: validated.recipe, ingredientsValid: validated.ingredientsValid });
  }

  const recipes = validatedRecipes.map(({ recipe }) => recipe);
  const recipeKeys = recipes.map((recipe) => recipeLookupKey(recipe));
  const duplicateKeys = recipeKeys.filter((key, index) => recipeKeys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    throw new Error(`Duplicate canonical recipe keys: ${[...new Set(duplicateKeys)].join(', ')}`);
  }

  const recipeKeySet = new Set(recipeKeys);
  for (const variant of variantConfig.recipes ?? []) {
    if (!recipeKeySet.has(recipeLookupKey(variant.parentRecipe))) {
      throw new Error(`Variant parent missing after preflight: ${variant.parentRecipe.name}`);
    }
  }
  for (const link of componentConfig.components ?? []) {
    if (!recipeKeySet.has(recipeLookupKey({ ...link.parentRecipe, variantKey: 'base' }))) {
      throw new Error(`Component parent missing after preflight: ${link.parentRecipe.name}`);
    }
    if (!recipeKeySet.has(recipeLookupKey({ ...link.componentRecipe, variantKey: 'base' }))) {
      throw new Error(`Component recipe missing after preflight: ${link.componentRecipe.name}`);
    }
  }

  if (dryRun) {
    const countsBySource = recipes.reduce<Record<string, number>>((counts, recipe) => {
      const source = recipe.sourceDiet ?? 'no-source';
      counts[source] = (counts[source] ?? 0) + 1;
      return counts;
    }, {});
    const readyCount = validatedRecipes.filter(({ recipe, ingredientsValid }) => isNutritionReady({
      kcalPerServing: recipe.kcalPerServing,
      proteinG: recipe.proteinG,
      carbsG: recipe.carbsG,
      fatG: recipe.fatG,
      ingredientsValid,
    })).length;
    console.log(`\nDry run passed: ${recipes.length} unique recipes; ${readyCount} nutrition-ready.`);
    console.log(`Excluded suspicious recipes: ${invalidRecipes.length}.`);
    console.table(countsBySource);
    return;
  }

  console.log(`\n🌱 Seeding ${recipes.length} recipes into database...\n`);
  let ingredientCount = 0;
  let recipeCount = 0;
  const recipeIds = new Map<string, string>();

  for (const { recipe, ingredientsValid } of validatedRecipes) {
    const recipeId = await prisma.$transaction(async (tx) => {
      const ingredientIds = new Map<string, string>();
      for (const ingredient of recipe.ingredients) {
        const pkgData = buildPackageData(getPackageInfo(ingredient.name));
        const category = resolveCategory(ingredient);
        const record = await tx.ingredient.upsert({
          where: { name: ingredient.name },
          update: { category, ...pkgData },
          create: { name: ingredient.name, category, ...pkgData },
        });
        ingredientIds.set(ingredient.name, record.id);
      }

      const ready = isNutritionReady({
        kcalPerServing: recipe.kcalPerServing,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        ingredientsValid,
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
        nutritionReady: ready,
        variantOfId: null,
      };
      const existing = await tx.recipe.findFirst({
        where: {
          name: recipe.name,
          sourceDiet: recipe.sourceDiet ? { in: sourceDietCandidates(recipe.sourceDiet) } : null,
          variantKey: recipe.variantKey ?? 'base',
        },
      });
      const dbRecipe = existing
        ? await tx.recipe.update({ where: { id: existing.id }, data })
        : await tx.recipe.create({ data: { name: recipe.name, ...data } });

      await tx.recipeIngredient.deleteMany({ where: { recipeId: dbRecipe.id } });
      await tx.recipeIngredient.createMany({
        data: recipe.ingredients.flatMap((ingredient) => {
          const ingredientId = ingredientIds.get(ingredient.name);
          if (!ingredientId) return [];
          return [{
            recipeId: dbRecipe.id,
            ingredientId,
            amountG: ingredient.amountG,
            displayText: ingredient.displayText ?? null,
            scalesLinearly: scalesLinearly(ingredient.name),
          }];
        }),
      });
      return dbRecipe.id;
    });

    recipeIds.set(recipeLookupKey(recipe), recipeId);
    recipeCount += 1;
    ingredientCount += recipe.ingredients.length;
    console.log(`✅ [${recipe.type}] ${recipe.name} (${recipe.variantKey ?? 'base'})`);
  }

  const variantUpdates = recipes.flatMap((recipe) => {
    if (!recipe.variantOf) return [];
    const childId = recipeIds.get(recipeLookupKey(recipe));
    const parentId = recipeIds.get(recipeLookupKey(recipe.variantOf));
    if (!childId || !parentId) throw new Error(`Variant link missing: ${recipe.name}`);
    return [{ childId, parentId }];
  });
  await prisma.$transaction(variantUpdates.map(({ childId, parentId }) => prisma.recipe.update({
    where: { id: childId },
    data: { variantOfId: parentId },
  })));

  const componentRows = (componentConfig.components ?? []).map((link) => {
    const parentId = recipeIds.get(recipeLookupKey({ ...link.parentRecipe, variantKey: 'base' }));
    const componentId = recipeIds.get(recipeLookupKey({ ...link.componentRecipe, variantKey: 'base' }));
    if (!parentId || !componentId) throw new Error(`Component link missing: ${link.parentRecipe.name}`);
    return {
      parentRecipeId: parentId,
      componentRecipeId: componentId,
      servingsUsed: 1,
      displayText: link.usage ?? null,
      note: link.note ?? null,
    };
  });
  const managedParentIds = [...new Set(componentRows.map((row) => row.parentRecipeId))];
  if (managedParentIds.length) {
    await prisma.$transaction(async (tx) => {
      await tx.recipeComponent.deleteMany({ where: { parentRecipeId: { in: managedParentIds } } });
      await tx.recipeComponent.createMany({ data: componentRows });
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
