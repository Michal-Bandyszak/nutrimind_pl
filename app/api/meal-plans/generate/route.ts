import { NextRequest, NextResponse } from 'next/server';
import { generateWeekPlan } from '@/lib/services/MealPlanGenerator';
import { getSettings } from '@/lib/services/SettingsService';
import type { BatchConfig } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    let config: BatchConfig | undefined;
    try {
      const body = await req.json();
      config = body?.config ?? undefined;
    } catch {
      // no body is fine → fall through to settings default
    }

    // If no config provided, use saved default batch config from settings
    if (!config) {
      const settings = await getSettings();
      config = settings.defaultBatchConfig;
    }

    const plan = await generateWeekPlan(config);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się wygenerować planu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
