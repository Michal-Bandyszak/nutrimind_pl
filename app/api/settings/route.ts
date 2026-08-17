import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/services/SettingsService';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { isBatchConfig } from '@/lib/types';

export async function GET() {
  try {
    const context = await requireApiContext();
    const settings = await getSettings(context.householdId);
    return NextResponse.json({ data: settings });
  } catch (error) {
    const { message, status } = apiError(error, 'Nie udało się pobrać ustawień.');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await requireApiContext();
    const body = await req.json();
    if (body && Object.prototype.hasOwnProperty.call(body, 'defaultBatchConfig')
      && !isBatchConfig(body.defaultBatchConfig)) {
      return NextResponse.json({
        error: 'Nieprawidłowa konfiguracja batch cookingu.',
        code: 'INVALID_BATCH_CONFIG',
      }, { status: 400 });
    }
    const settings = await updateSettings(context.householdId, body);
    return NextResponse.json({ data: settings });
  } catch (error) {
    const { message, status } = apiError(error, 'Nie udało się zapisać ustawień.');
    return NextResponse.json({ error: message }, { status });
  }
}
