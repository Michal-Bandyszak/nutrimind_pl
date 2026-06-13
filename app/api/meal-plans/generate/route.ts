import { NextRequest, NextResponse } from 'next/server';
import { generateWeekPlan } from '@/lib/services/MealPlanGenerator';
import { getSettings } from '@/lib/services/SettingsService';
import type { BatchConfig } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    let body: { config?: BatchConfig; targetKcalPerPerson?: number } | null = null;
    let config: BatchConfig | undefined;
    try {
      body = await req.json();
      config = body?.config ?? undefined;
    } catch {
      // no body is fine → fall through to settings default
    }

    const settings = await getSettings();

    // If no config provided, use saved default batch config from settings
    if (!config) {
      config = settings.defaultBatchConfig;
    }

    const requestedTarget = Number(body?.targetKcalPerPerson);
    const targetKcalPerPerson = Number.isFinite(requestedTarget) && requestedTarget > 0
      ? requestedTarget
      : settings.personAKcal;

    const plan = await generateWeekPlan(config, undefined, targetKcalPerPerson);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wygenerować planu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
