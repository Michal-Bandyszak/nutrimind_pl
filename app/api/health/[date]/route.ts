import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiError, requireApiContext } from '@/lib/auth-context';

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Nieprawidłowy format daty.' }, { status: 400 });
  }
  try {
    const context = await requireApiContext();
    const log = await prisma.healthLog.findUnique({
      where: {
        personProfileId_date: {
          personProfileId: context.primaryProfileId,
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
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Nieprawidłowy format daty.' }, { status: 400 });
  }
  try {
    const context = await requireApiContext();
    const body = await req.json();
    const {
      morningDone, eveningDone,
      waterGlasses, sleepH, sleepQuality, energyLevel, moodLevel,
      pointsDiet, pointsSupp, pointsTrain, pointsRoutine, pointsRelax, pointsMindset,
    } = body;

    const data = {
      morningDone: Array.isArray(morningDone) ? JSON.stringify(morningDone) : undefined,
      eveningDone: Array.isArray(eveningDone) ? JSON.stringify(eveningDone) : undefined,
      waterGlasses: waterGlasses != null ? Number(waterGlasses) : undefined,
      sleepH: sleepH != null ? Number(sleepH) : undefined,
      sleepQuality: sleepQuality != null ? Number(sleepQuality) : undefined,
      energyLevel: energyLevel != null ? Number(energyLevel) : undefined,
      moodLevel: moodLevel != null ? Number(moodLevel) : undefined,
      pointsDiet: pointsDiet != null ? Number(pointsDiet) : undefined,
      pointsSupp: pointsSupp != null ? Number(pointsSupp) : undefined,
      pointsTrain: pointsTrain != null ? Number(pointsTrain) : undefined,
      pointsRoutine: pointsRoutine != null ? Number(pointsRoutine) : undefined,
      pointsRelax: pointsRelax != null ? Number(pointsRelax) : undefined,
      pointsMindset: pointsMindset != null ? Number(pointsMindset) : undefined,
    };
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const log = await prisma.healthLog.upsert({
      where: {
        personProfileId_date: {
          personProfileId: context.primaryProfileId,
          date,
        },
      },
      create: { personProfileId: context.primaryProfileId, date, ...cleanData },
      update: cleanData,
    });
    return NextResponse.json({ data: log });
  } catch (error) {
    const { message, status } = apiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
