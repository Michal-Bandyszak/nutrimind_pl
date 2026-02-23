import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const { dayOfWeek, recipeId } = await req.json() as {
      dayOfWeek: number;
      recipeId: string;
    };

    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7 || !recipeId) {
      return NextResponse.json(
        { error: 'Wymagane: dayOfWeek (1–7) i recipeId.' },
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

    const created = await prisma.mealPlanMeal.create({
      data: {
        mealPlanId: planId,
        dayOfWeek,
        mealType: 'snack',
        recipeId,
        servings: 1,
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
