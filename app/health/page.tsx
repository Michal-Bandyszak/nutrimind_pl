import { prisma } from '@/lib/db/prisma';
import HealthClient from './HealthClient';

export const dynamic = 'force-dynamic';

function todayDate(): string {
  // Return local YYYY-MM-DD — server is in UTC, pass to client which uses it as key
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export default async function HealthPage() {
  const date = todayDate();

  const raw = await prisma.healthLog.findUnique({ where: { date } });

  // Parse JSON fields before passing to client component
  const initialLog = raw
    ? {
        morningDone: (() => { try { return JSON.parse(raw.morningDone) as string[]; } catch { return []; } })(),
        eveningDone: (() => { try { return JSON.parse(raw.eveningDone) as string[]; } catch { return []; } })(),
        waterGlasses: raw.waterGlasses ?? 0,
        sleepH: raw.sleepH,
        sleepQuality: raw.sleepQuality,
        energyLevel: raw.energyLevel,
        moodLevel: raw.moodLevel,
        pointsDiet: raw.pointsDiet,
        pointsSupp: raw.pointsSupp,
        pointsTrain: raw.pointsTrain,
        pointsRoutine: raw.pointsRoutine,
        pointsRelax: raw.pointsRelax,
        pointsMindset: raw.pointsMindset,
      }
    : null;

  return <HealthClient date={date} initialLog={initialLog} />;
}
