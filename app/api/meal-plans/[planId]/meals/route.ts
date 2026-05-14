import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const CORE_MEAL_TYPES = new Set(['breakfast', 'second_breakfast', 'lunch', 'dinner', 'cocktail']);
const ALLOWED_MEAL_TYPES = new Set([...CORE_MEAL_TYPES, 'snack', 'dessert', 'extra']);

function mealTypeLabel(mealType: string) {
  switch (mealType) {
    case 'breakfast':
      return 'Śniadanie';
    case 'second_breakfast':
      return 'Drugie śniadanie';
    case 'lunch':
      return 'Obiad';
    case 'dinner':
      return 'Kolacja';
    case 'cocktail':
      return 'Koktajl';
    case 'dessert':
      return 'Ciasto / deser';
    case 'extra':
      return 'Dodatkowy';
    case 'snack':
    default:
      return 'Przekąska';
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const body = await req.json() as {
      dayOfWeek: number;
      recipeId: string;
      mealType?: string;
      servings?: number;
    };
    const mealType = typeof body.mealType === 'string' && body.mealType.trim() ? body.mealType.trim() : 'snack';
    const servings = Number.isFinite(Number(body.servings)) && Number(body.servings) > 0
      ? Number(body.servings)
      : 1;
    const dayOfWeek = Number(body.dayOfWeek);
    const recipeId = body.recipeId;

    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7 || !recipeId) {
      return NextResponse.json(
        { error: 'Wymagane: dayOfWeek (1–7) i recipeId.' },
        { status: 400 },
      );
    }
    if (!ALLOWED_MEAL_TYPES.has(mealType)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ posiłku.' },
        { status: 400 },
      );
    }

    const [plan, recipe] = await Promise.all([
      prisma.mealPlan.findUnique({ where: { id: planId } }),
      prisma.recipe.findUnique({ where: { id: recipeId } }),
    ]);

    if (!plan) {
      return NextResponse.json({ error: 'Plan nie istnieje.' }, { status: 404 });
    }
    if (!recipe) {
      return NextResponse.json({ error: 'Przepis nie istnieje.' }, { status: 404 });
    }

    if (CORE_MEAL_TYPES.has(mealType)) {
      const existing = await prisma.mealPlanMeal.findFirst({
        where: { mealPlanId: planId, dayOfWeek, mealType },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: `W dniu ${dayOfWeek} slot "${mealTypeLabel(mealType)}" jest już zajęty.` },
          { status: 409 },
        );
      }
    }

    const created = await prisma.mealPlanMeal.create({
      data: {
        mealPlanId: planId,
        dayOfWeek,
        mealType,
        recipeId,
        servings,
        batchGroupId: null,
        batchDayNum: null,
      },
      include: {
        recipe: {
          include: { ingredients: { include: { ingredient: true } } },
        },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
