import { NextRequest, NextResponse } from 'next/server';
import { buildShoppingList } from '@/lib/services/ShoppingListBuilder';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const list = await buildShoppingList(planId);
    return NextResponse.json({ data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
