import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const { dayOfWeek, mealType, newRecipeId } = await req.json() as {
      dayOfWeek: number;
      mealType: string;
      newRecipeId: string;
    };

    if (!dayOfWeek || !mealType || !newRecipeId) {
      return NextResponse.json({ error: 'Brakuje wymaganych pól.' }, { status: 400 });
    }

    const meal = await prisma.mealPlanMeal.findFirst({
      where: { mealPlanId: planId, dayOfWeek, mealType },
    });

    if (!meal) {
      return NextResponse.json({ error: 'Posiłek nie znaleziony.' }, { status: 404 });
    }

    // Replace across entire batch group (or single meal if no batch)
    await prisma.mealPlanMeal.updateMany({
      where: {
        mealPlanId: planId,
        mealType,
        ...(meal.batchGroupId
          ? { batchGroupId: meal.batchGroupId }
          : { dayOfWeek }),
      },
      data: { recipeId: newRecipeId },
    });

    return NextResponse.json({ data: { ok: true, batchGroupId: meal.batchGroupId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
