import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/services/SettingsService';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch {
    return NextResponse.json({ error: 'Nie udało się pobrać ustawień.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await updateSettings(body);
    return NextResponse.json({ data: settings });
  } catch {
    return NextResponse.json({ error: 'Nie udało się zapisać ustawień.' }, { status: 500 });
  }
}
