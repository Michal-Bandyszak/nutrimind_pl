import { NextRequest, NextResponse } from 'next/server';
import { generateWeekPlan } from '@/lib/services/MealPlanGenerator';
import { getSettings } from '@/lib/services/SettingsService';
import { isBatchConfig, type BatchConfig } from '@/lib/types';
import { apiError, requireApiContext } from '@/lib/auth-context';

export async function POST(req: NextRequest) {
  try {
    const context = await requireApiContext();
    let body: { config?: unknown } | null = null;
    let config: BatchConfig | undefined;
    try {
      body = await req.json();
      if (body?.config !== undefined && !isBatchConfig(body.config)) {
        return NextResponse.json({
          error: 'Nieprawidłowa konfiguracja batch cookingu.',
          code: 'INVALID_BATCH_CONFIG',
        }, { status: 400 });
      }
      config = body?.config as BatchConfig | undefined;
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
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    const { message, status, ...details } = apiError(error, 'Nie udało się wygenerować planu.');
    return NextResponse.json({ error: message, ...details }, { status });
  }
}
