import { NextResponse } from 'next/server';
import { getActivePlan } from '@/lib/services/MealPlanGenerator';
import { apiError, requireApiContext } from '@/lib/auth-context';

export async function GET() {
  try {
    const context = await requireApiContext();
    const plan = await getActivePlan(context.householdId);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
