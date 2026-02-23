import { NextResponse } from 'next/server';
import { getActivePlan } from '@/lib/services/MealPlanGenerator';

export async function GET() {
  try {
    const plan = await getActivePlan();
    return NextResponse.json({ data: plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd serwera.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
