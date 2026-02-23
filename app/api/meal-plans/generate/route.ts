import { NextRequest, NextResponse } from 'next/server';
import { generateWeekPlan } from '@/lib/services/MealPlanGenerator';
import type { BatchConfig } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    let config: BatchConfig | undefined;
    try {
      const body = await req.json();
      config = body?.config ?? undefined;
    } catch {
      // no body is fine → use default config
    }

    const plan = await generateWeekPlan(config);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wygenerować planu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
