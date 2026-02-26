import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const VALID_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert'];
const VALID_CATEGORIES = ['vegetables', 'fruits', 'grains', 'protein', 'dairy', 'oils', 'nuts', 'spices', 'other'];

// PATCH /api/recipes/[id] — update recipe + replace all ingredients
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const {
      name, type, ingredients,
      kcalPerServing, proteinG, carbsG, fatG, fiberG,
      prepTimeMin, batchFriendly, maxStorageDays, instructions,
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
    const isValidNum = (v: unknown) => typeof v === 'number' && isFinite(v) && v >= 0;
    if (!isValidNum(kcalPerServing) || !isValidNum(proteinG) || !isValidNum(carbsG) || !isValidNum(fatG)) {
      return NextResponse.json({ error: 'Makroskładniki (kcal, białko, węgle, tłuszcze) są wymagane.' }, { status: 400 });
    }

    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Przepis nie istnieje.' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing ingredients
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });

      // Upsert ingredients and collect ids
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

      // Update recipe
      await tx.recipe.update({
        where: { id },
        data: {
          name: name.trim(),
          type,
          prepTimeMin: prepTimeMin ?? null,
          batchFriendly: batchFriendly ?? false,
          maxStorageDays: maxStorageDays ?? 1,
          kcalPerServing,
          proteinG,
          carbsG,
          fatG,
          fiberG: fiberG ?? null,
          instructions: JSON.stringify(Array.isArray(instructions) ? instructions : []),
        },
      });

      for (const ing of resolvedIngredients) {
        await tx.recipeIngredient.create({
          data: {
            recipeId: id,
            ingredientId: ing.id,
            amountG: ing.amountG,
            displayText: ing.displayText ?? null,
            scalesLinearly: ing.scalesLinearly,
          },
        });
      }

      return tx.recipe.findUnique({
        where: { id },
        include: { ingredients: { include: { ingredient: true } } },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/recipes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Przepis nie istnieje.' }, { status: 404 });
    }

    const usedInPlan = await prisma.mealPlanMeal.findFirst({
      where: { recipeId: id, mealPlan: { status: 'active' } },
    });
    if (usedInPlan) {
      return NextResponse.json(
        { error: 'Przepis jest używany w aktywnym planie tygodnia. Usuń go najpierw z planu.' },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
      prisma.mealPlanMeal.deleteMany({ where: { recipeId: id } }),
      prisma.recipe.delete({ where: { id } }),
    ]);

    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
