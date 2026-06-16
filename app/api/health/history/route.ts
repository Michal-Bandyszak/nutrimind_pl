import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { safeJsonParse } from '@/lib/utils/formatUnits';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 90;

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(req: NextRequest) {
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'));

  try {
    const logs = await prisma.healthLog.findMany({
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      data: logs.map((log) => ({
        id: log.id,
        date: log.date,
        morningDone: safeJsonParse<string[]>(log.morningDone, []),
        eveningDone: safeJsonParse<string[]>(log.eveningDone, []),
        waterGlasses: log.waterGlasses ?? 0,
        sleepH: log.sleepH,
        sleepQuality: log.sleepQuality,
        energyLevel: log.energyLevel,
        moodLevel: log.moodLevel,
        pointsDiet: log.pointsDiet,
        pointsSupp: log.pointsSupp,
        pointsTrain: log.pointsTrain,
        pointsRoutine: log.pointsRoutine,
        pointsRelax: log.pointsRelax,
        pointsMindset: log.pointsMindset,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Błąd serwera.' }, { status: 500 });
  }
}
