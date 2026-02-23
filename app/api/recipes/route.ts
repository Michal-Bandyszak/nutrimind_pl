import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const VALID_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, type, ingredients,
      kcalPerServing, proteinG, carbsG, fatG, fiberG,
      prepTimeMin, cookTimeMin, batchFriendly, maxStorageDays, instructions,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Pole "name" jest wymagane.' }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Nieprawidłowy typ przepisu.' }, { status: 400 });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Wymagany co najmniej 1 składnik.' }, { status: 400 });
    }
    if (typeof kcalPerServing !== 'number' || typeof proteinG !== 'number' ||
        typeof carbsG !== 'number' || typeof fatG !== 'number') {
      return NextResponse.json({ error: 'Makroskładniki (kcal, białko, węgle, tłuszcze) są wymagane.' }, { status: 400 });
    }

    const existing = await prisma.recipe.findFirst({
      where: { name: name.trim(), sourceDiet: 'custom' },
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
          create: { name: ing.name, category: ing.category || 'other' },
        });
        resolvedIngredients.push({
          id: ingredient.id,
          amountG: ing.amountG,
          displayText: ing.displayText,
          scalesLinearly: ing.scalesLinearly !== false,
        });
      }

      const created = await tx.recipe.create({
        data: {
          name: name.trim(),
          type,
          prepTimeMin: prepTimeMin ?? null,
          cookTimeMin: cookTimeMin ?? null,
          batchFriendly: batchFriendly ?? false,
          maxStorageDays: maxStorageDays ?? 1,
          kcalPerServing,
          proteinG,
          carbsG,
          fatG,
          fiberG: fiberG ?? null,
          instructions: JSON.stringify(Array.isArray(instructions) ? instructions : []),
          sourceDiet: 'custom',
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

    const recipes = await prisma.recipe.findMany({
      where: {
        ...(type && type !== 'all' ? { type } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      include: {
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
