import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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
