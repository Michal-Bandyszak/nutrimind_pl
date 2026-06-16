import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const VALID_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert'];
const VALID_CATEGORIES = ['vegetables', 'fruits', 'grains', 'protein', 'dairy', 'oils', 'nuts', 'spices', 'other'];

const VALID_INGREDIENT_BASIS = ['per-serving', 'per-whole'];
const VALID_SOURCES = ['dietitian', 'user'];
const VALID_ROLES = ['meal', 'component'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, type, ingredients,
      kcalPerServing, proteinG, carbsG, fatG, fiberG,
      prepTimeMin, cookTimeMin, batchFriendly, maxStorageDays, instructions,
      // new fields
      baseServings, ingredientBasis, source, nutritionVerified, role, variantKey, adjustmentNote,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Pole "name" jest wymagane.' }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nazwa przepisu jest zbyt długa (max 200 znaków).' }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Nieprawidłowy typ przepisu.' }, { status: 400 });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Wymagany co najmniej 1 składnik.' }, { status: 400 });
    }
    if (ingredients.length > 50) {
      return NextResponse.json({ error: 'Za dużo składników (max 50).' }, { status: 400 });
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

    const resolvedSource: string = source ?? 'user';
    const resolvedBasis: string = ingredientBasis ?? 'per-serving';
    const resolvedBaseServings: number = typeof baseServings === 'number' && baseServings > 0 ? baseServings : 1;
    const resolvedRole: string = role ?? 'meal';
    const resolvedVariantKey: string = typeof variantKey === 'string' && variantKey.trim() ? variantKey.trim() : 'base';
    // Only mark as verified if explicitly passed as true; user-submitted recipes default to unverified
    const resolvedVerified: boolean = nutritionVerified === true;

    const existing = await prisma.recipe.findFirst({
      where: { name: name.trim(), source: resolvedSource, variantKey: resolvedVariantKey },
    });
    if (existing) {
      return NextResponse.json({ error: 'Przepis o tej nazwie już istnieje.' }, { status: 409 });
    }

    const recipeId = await prisma.$transaction(async (tx) => {
      const resolvedIngredients: { id: string; amountG: number; displayText?: string; scalesLinearly: boolean }[] = [];

      for (const ing of ingredients) {
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

      const isValidNum = (v: unknown) => typeof v === 'number' && isFinite(v) && v >= 0;
      const created = await tx.recipe.create({
        data: {
          name: name.trim(),
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
          role: resolvedRole,
          variantKey: resolvedVariantKey,
          adjustmentNote: typeof adjustmentNote === 'string' && adjustmentNote.trim()
            ? adjustmentNote.trim()
            : null,
          ingredientBasis: resolvedBasis,
          baseServings: resolvedBaseServings,
          nutritionVerified: resolvedVerified,
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
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const q = searchParams.get('q');
    const verifiedParam = searchParams.get('verified'); // "true" | "false" | null
    const sourceParam = searchParams.get('source');     // "dietitian" | "user" | null

    const recipes = await prisma.recipe.findMany({
      where: {
        ...(type && type !== 'all' ? { type } : {}),
        ...(q ? { name: { contains: q } } : {}),
        ...(verifiedParam === 'true'  ? { nutritionVerified: true }  : {}),
        ...(verifiedParam === 'false' ? { nutritionVerified: false } : {}),
        ...(sourceParam && VALID_SOURCES.includes(sourceParam) ? { source: sourceParam } : {}),
      },
      include: {
        variantOf: true,
        variants: true,
        componentLinks: {
          include: {
            componentRecipe: {
              include: { ingredients: { include: { ingredient: true } } },
            },
          },
        },
        ingredients: { include: { ingredient: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: recipes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
