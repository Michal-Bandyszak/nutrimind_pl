import { prisma } from '@/lib/db/prisma';
import { DEFAULT_BATCH_CONFIG, type BatchConfig } from '@/lib/types';

export type AppSettingsData = {
  profiles: {
    id: string;
    name: string;
    targetKcal: number;
    isPrimary: boolean;
    activeForPlanning: boolean;
  }[];
  planMode: 'shared' | 'solo';
  defaultBatchConfig: BatchConfig;
};

function parseBatchConfig(raw: string): BatchConfig {
  if (!raw) return DEFAULT_BATCH_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<BatchConfig>;
    if (parsed.breakfast && parsed.second_breakfast && parsed.lunch && parsed.dinner && parsed.cocktail) return parsed as BatchConfig;
    // Partial saved config — merge with defaults so all fields are present
    if (parsed.breakfast || parsed.lunch || parsed.dinner) {
      return { ...DEFAULT_BATCH_CONFIG, ...parsed } as BatchConfig;
    }
  } catch {
    // fall through
  }
  return DEFAULT_BATCH_CONFIG;
}

export async function getSettings(householdId: string): Promise<AppSettingsData> {
  const row = await prisma.appSettings.upsert({
    where: { householdId },
    create: { householdId },
    update: {},
  });
  const profiles = await prisma.personProfile.findMany({
    where: { householdId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  return {
    profiles: profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      targetKcal: profile.targetKcal,
      isPrimary: profile.isPrimary,
      activeForPlanning: profile.activeForPlanning,
    })),
    planMode: row.planMode === 'solo' ? 'solo' : 'shared',
    defaultBatchConfig: parseBatchConfig(row.defaultBatchConfig),
  };
}

export async function updateSettings(
  householdId: string,
  data: Partial<AppSettingsData>,
): Promise<AppSettingsData> {
  const updateData: Record<string, unknown> = {};
  if (data.planMode !== undefined) updateData.planMode = data.planMode === 'solo' ? 'solo' : 'shared';
  if (data.defaultBatchConfig !== undefined)
    updateData.defaultBatchConfig = JSON.stringify(data.defaultBatchConfig);

  await prisma.appSettings.upsert({
    where: { householdId },
    create: { householdId, ...updateData },
    update: updateData,
  });

  if (Array.isArray(data.profiles)) {
    await prisma.$transaction(
      data.profiles.map((profile) =>
        prisma.personProfile.updateMany({
          where: { id: profile.id, householdId },
          data: {
            name: profile.name.trim().slice(0, 30) || 'Osoba',
            targetKcal: Math.max(800, Math.min(6000, Math.round(profile.targetKcal))),
            activeForPlanning: profile.activeForPlanning,
          },
        }),
      ),
    );
  }

  return getSettings(householdId);
}
