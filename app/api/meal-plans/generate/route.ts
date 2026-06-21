import { NextRequest, NextResponse } from 'next/server';
import { generateWeekPlan } from '@/lib/services/MealPlanGenerator';
import { getSettings } from '@/lib/services/SettingsService';
import type { BatchConfig } from '@/lib/types';
import { apiError, requireApiContext } from '@/lib/auth-context';

export async function POST(req: NextRequest) {
  try {
    const context = await requireApiContext();
    let body: { config?: BatchConfig } | null = null;
    let config: BatchConfig | undefined;
    try {
      body = await req.json();
      config = body?.config ?? undefined;
    } catch {
      // no body is fine → fall through to settings default
    }

    const settings = await getSettings(context.householdId);

    // If no config provided, use saved default batch config from settings
    if (!config) {
      config = settings.defaultBatchConfig;
    }

    const activeProfiles = settings.profiles.filter((profile) => profile.activeForPlanning);
    const profiles = settings.planMode === 'solo'
      ? activeProfiles.filter((profile) => profile.isPrimary)
      : activeProfiles;
    const plan = await generateWeekPlan(context.householdId, profiles, config);
    return NextResponse.json({ data: plan });
  } catch (error) {
    const { message, status } = apiError(error, 'Nie udało się wygenerować planu.');
    return NextResponse.json({ error: message }, { status });
  }
}
