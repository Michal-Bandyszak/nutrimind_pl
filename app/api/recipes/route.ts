import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { visibleRecipeWhere } from '@/lib/access';
import { normalizeRecipeName } from '@/lib/utils/recipeConstants';
import { isNutritionReady } from '@/lib/utils/nutritionReady';
import { normalizeIngredientName, isSuspiciousIngredientName } from '@/lib/utils/ingredientNormalization';

const VALID_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert'];
const VALID_CATEGORIES = ['vegetables', 'fruits', 'grains', 'protein', 'dairy', 'oils', 'nuts', 'spices', 'other'];

const VALID_INGREDIENT_BASIS = ['per-serving', 'per-whole'];
const VALID_SOURCES = ['dietitian', 'user', 'curated'];
const VALID_ROLES = ['meal', 'component'];

const RECIPE_PICKER_SELECT = {
  id: true,
  name: true,
  type: true,
  role: true,
  kcalPerServing: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  nutritionReady: true,
} satisfies Prisma.RecipeSelect;

const RECIPE_LIST_SELECT = {
  id: true,
  name: true,
  type: true,
  role: true,
  source: true,
  variantKey: true,
  adjustmentNote: true,
  tags: true,
  ingredientBasis: true,
  baseServings: true,
  prepTimeMin: true,
  cookTimeMin: true,
  kcalPerServing: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  nutritionReady: true,
} satisfies Prisma.RecipeSelect;

export async function POST(req: NextRequest) {
  try {
    const context = await requireApiContext();
    const body = await req.json();
    const {
      name, type, ingredients,
      kcalPerServing, proteinG, carbsG, fatG, fiberG,
      prepTimeMin, cookTimeMin, batchFriendly, maxStorageDays, instructions,
      // new fields
      baseServings, ingredientBasis, source, role, variantKey, adjustmentNote,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Pole "name" jest wymagane.' }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nazwa przepisu jest zbyt długa (max 200 znaków).' }, { status: 400 });
    }
    const normalizedName = normalizeRecipeName(name);
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Nieprawidłowy typ przepisu.' }, { status: 400 });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Wymagany co najmniej 1 składnik.' }, { status: 400 });
    }
    if (ingredients.length > 50) {
      return NextResponse.json({ error: 'Za dużo składników (max 50).' }, { status: 400 });
    }
    const ingredientRows = ingredients
      .filter((ing: any) => ing && typeof ing.name === 'string')
      .map((ing: any) => ({ ...ing, name: normalizeIngredientName(ing.name) }));
    if (ingredientRows.length !== ingredients.length || ingredientRows.some((ing: any) => (
      !ing.name || typeof ing.amountG !== 'number' || !Number.isFinite(ing.amountG) || ing.amountG <= 0
    ))) {
      return NextResponse.json({ error: 'Każdy składnik musi mieć nazwę i dodatnią gramaturę.' }, { status: 400 });
    }
    if (new Set(ingredientRows.map((ing: any) => ing.name)).size !== ingredientRows.length) {
      return NextResponse.json({ error: 'Ten sam składnik występuje więcej niż raz po normalizacji.' }, { status: 400 });
    }
    if (ingredientBasis && !VALID_INGREDIENT_BASIS.includes(ingredientBasis)) {
      return NextResponse.json({ error: 'Nieprawidłowa wartość ingredientBasis.' }, { status: 400 });
    }
    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: 'Nieprawidłowa wartość source.' }, { status: 400 });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Nieprawidłowa wartość role.' }, { status: 400 });
    }

    const resolvedSource = 'user';
    const resolvedBasis: string = ingredientBasis ?? 'per-serving';
    const resolvedBaseServings: number = typeof baseServings === 'number' && baseServings > 0 ? baseServings : 1;
    const resolvedRole: string = role ?? 'meal';
    const resolvedVariantKey: string = typeof variantKey === 'string' && variantKey.trim() ? variantKey.trim() : 'base';
    const existing = await prisma.recipe.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        source: resolvedSource,
        variantKey: resolvedVariantKey,
        householdId: context.householdId,
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Przepis o tej nazwie już istnieje.' }, { status: 409 });
    }

    const recipeId = await prisma.$transaction(async (tx) => {
      const resolvedIngredients: { id: string; amountG: number; displayText?: string; scalesLinearly: boolean }[] = [];
      const isValidNum = (v: unknown) => typeof v === 'number' && isFinite(v) && v >= 0;
      const validInputIngredients = ingredientRows;

      for (const ing of validInputIngredients) {
        const ingredient = await tx.ingredient.upsert({
          where: { name: ing.name },
          update: {},
          create: { name: ing.name, category: VALID_CATEGORIES.includes(ing.category) ? ing.category : 'other' },
        });
        resolvedIngredients.push({
          id: ingredient.id,
          amountG: ing.amountG,
          displayText: ing.displayText,
          scalesLinearly: ing.scalesLinearly !== false,
        });
      }

      const ready = isNutritionReady({
        kcalPerServing,
        proteinG,
        carbsG,
        fatG,
        ingredientsValid: validInputIngredients.length === ingredients.length
          && validInputIngredients.every((ingredient) => !isSuspiciousIngredientName(ingredient.name)),
      });
      const created = await tx.recipe.create({
        data: {
          name: normalizedName,
          type,
          prepTimeMin: prepTimeMin ?? null,
          cookTimeMin: cookTimeMin ?? null,
          batchFriendly: batchFriendly ?? false,
          maxStorageDays: maxStorageDays ?? 1,
          kcalPerServing: isValidNum(kcalPerServing) ? kcalPerServing : null,
          proteinG:       isValidNum(proteinG)       ? proteinG       : null,
          carbsG:         isValidNum(carbsG)         ? carbsG         : null,
          fatG:           isValidNum(fatG)           ? fatG           : null,
          fiberG:         isValidNum(fiberG)         ? fiberG         : null,
          instructions: JSON.stringify(Array.isArray(instructions) ? instructions : []),
          sourceDiet: null,
          source: resolvedSource,
          householdId: context.householdId,
          role: resolvedRole,
          variantKey: resolvedVariantKey,
          adjustmentNote: typeof adjustmentNote === 'string' && adjustmentNote.trim()
            ? adjustmentNote.trim()
            : null,
          ingredientBasis: resolvedBasis,
          baseServings: resolvedBaseServings,
          nutritionReady: ready,
        },
      });

      for (const ing of resolvedIngredients) {
        await tx.recipeIngredient.create({
          data: {
            recipeId: created.id,
            ingredientId: ing.id,
            amountG: ing.amountG,
            displayText: ing.displayText ?? null,
            scalesLinearly: ing.scalesLinearly,
          },
        });
      }

      return created.id;
    });

    const result = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireApiContext();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const q = searchParams.get('q');
    const view = searchParams.get('view');
    const readyParam = searchParams.get('ready') ?? searchParams.get('verified'); // compatibility alias
    const sourceParam = searchParams.get('source');     // "dietitian" | "user" | "curated" | null

    const where = {
      ...visibleRecipeWhere(context.householdId),
      ...(type && type !== 'all' ? { type } : {}),
      ...(q ? { name: { contains: q } } : {}),
      ...(readyParam === 'true' ? { nutritionReady: true } : {}),
      ...(readyParam === 'false' ? { nutritionReady: false } : {}),
      ...(sourceParam && VALID_SOURCES.includes(sourceParam) ? { source: sourceParam } : {}),
    };

    if (view === 'picker') {
      const recipes = await prisma.recipe.findMany({
        where,
        select: RECIPE_PICKER_SELECT,
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ data: recipes });
    }

    if (view === 'list') {
      const recipes = await prisma.recipe.findMany({
        where,
        select: RECIPE_LIST_SELECT,
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ data: recipes });
    }

    const recipes = await prisma.recipe.findMany({
      where,
      select: RECIPE_LIST_SELECT,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: recipes });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
