import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiError, requireApiContext } from '@/lib/auth-context';
import { isValidDateKey } from '@/lib/utils/appDate';

const INVALID_INPUT = 'INVALID_HEALTH_LOG_INPUT';

function optionalNumber(value: unknown, min: number, max: number, integer = false): number | null | undefined {
  if (value === undefined || value === null) return value;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new Error(INVALID_INPUT);
  }
  return number;
}

function routineValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(INVALID_INPUT);
  }
  return JSON.stringify(value);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDateKey(date)) {
    return NextResponse.json({ error: 'Nieprawidłowy format daty.' }, { status: 400 });
  }
  try {
    const context = await requireApiContext();
    const log = await prisma.healthLog.findUnique({
      where: {
        personProfileId_date: {
          personProfileId: context.personProfileId,
          date,
        },
      },
    });
    return NextResponse.json({ data: log });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDateKey(date)) {
    return NextResponse.json({ error: 'Nieprawidłowy format daty.' }, { status: 400 });
  }
  try {
    const context = await requireApiContext();
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(INVALID_INPUT);
    const {
      morningDone, eveningDone,
      waterGlasses, sleepH, sleepQuality, energyLevel, moodLevel,
      pointsDiet, pointsSupp, pointsTrain, pointsRoutine, pointsRelax, pointsMindset,
    } = body as Record<string, unknown>;

    const data = {
      morningDone: routineValue(morningDone),
      eveningDone: routineValue(eveningDone),
      waterGlasses: optionalNumber(waterGlasses, 0, 30, true),
      sleepH: optionalNumber(sleepH, 0, 24),
      sleepQuality: optionalNumber(sleepQuality, 1, 5, true),
      energyLevel: optionalNumber(energyLevel, 1, 5, true),
      moodLevel: optionalNumber(moodLevel, 1, 5, true),
      pointsDiet: optionalNumber(pointsDiet, 1, 3, true),
      pointsSupp: optionalNumber(pointsSupp, 1, 3, true),
      pointsTrain: optionalNumber(pointsTrain, 1, 3, true),
      pointsRoutine: optionalNumber(pointsRoutine, 1, 3, true),
      pointsRelax: optionalNumber(pointsRelax, 1, 3, true),
      pointsMindset: optionalNumber(pointsMindset, 1, 3, true),
    };
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const log = await prisma.healthLog.upsert({
      where: {
        personProfileId_date: {
          personProfileId: context.personProfileId,
          date,
        },
      },
      create: { personProfileId: context.personProfileId, date, ...cleanData },
      update: cleanData,
    });
    return NextResponse.json({ data: log });
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_INPUT) {
      return NextResponse.json({ error: 'Nieprawidłowe dane dziennika.' }, { status: 400 });
    }
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
