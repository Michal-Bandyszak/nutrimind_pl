import { prisma } from '@/lib/db/prisma';
import { safeJsonParse } from '@/lib/utils/formatUnits';
import HealthClient from './HealthClient';
import { requireAuthContext } from '@/lib/auth-context';
import { todayInAppTimeZone } from '@/lib/utils/appDate';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const context = await requireAuthContext();
  const date = todayInAppTimeZone();

  const raw = await prisma.healthLog.findUnique({
    where: {
      personProfileId_date: {
        personProfileId: context.primaryProfileId,
        date,
      },
    },
  });

  // Parse JSON fields before passing to client component
  const initialLog = raw
    ? {
        morningDone: safeJsonParse<string[]>(raw.morningDone, []),
        eveningDone: safeJsonParse<string[]>(raw.eveningDone, []),
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
