import { prisma } from '@/lib/db/prisma';
import { DEFAULT_BATCH_CONFIG, type BatchConfig } from '@/lib/types';

export type AppSettingsData = {
  personAName: string;
  personAKcal: number;
  personBName: string;
  personBKcal: number;
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

export async function getSettings(): Promise<AppSettingsData> {
  const row = await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: {},
    update: {},
  });
  return {
    personAName: row.personAName,
    personAKcal: row.personAKcal,
    personBName: row.personBName,
    personBKcal: row.personBKcal,
    defaultBatchConfig: parseBatchConfig(row.defaultBatchConfig),
  };
}

export async function updateSettings(data: Partial<AppSettingsData>): Promise<AppSettingsData> {
  const updateData: Record<string, unknown> = {};
  if (data.personAName !== undefined) updateData.personAName = data.personAName;
  if (data.personAKcal !== undefined) updateData.personAKcal = data.personAKcal;
  if (data.personBName !== undefined) updateData.personBName = data.personBName;
  if (data.personBKcal !== undefined) updateData.personBKcal = data.personBKcal;
  if (data.defaultBatchConfig !== undefined)
    updateData.defaultBatchConfig = JSON.stringify(data.defaultBatchConfig);

  await prisma.appSettings.upsert({
    where: { id: 'default' },
    create: updateData,
    update: updateData,
  });
  return getSettings();
}
