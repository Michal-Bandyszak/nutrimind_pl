import { NextRequest, NextResponse } from 'next/server';
import { buildShoppingList } from '@/lib/services/ShoppingListBuilder';
import { apiError, requireApiContext } from '@/lib/auth-context';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const context = await requireApiContext();
    const { planId } = await params;
    const list = await buildShoppingList(planId, context.householdId);
    return NextResponse.json({ data: list });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
