export type BatchColor = {
  bg: string;
  border: string;
  text: string;
  dot: string;
};

const BATCH_COLORS: BatchColor[] = [
  { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   dot: 'bg-teal-400' },
  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    dot: 'bg-sky-400' },
  { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   dot: 'bg-rose-400' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-400' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400' },
];

export function buildBatchColorMap(batchGroupIds: (string | null)[]): Map<string, BatchColor> {
  const unique = [...new Set(batchGroupIds.filter(Boolean) as string[])];
  const map = new Map<string, BatchColor>();
  unique.forEach((id, idx) => {
    map.set(id, BATCH_COLORS[idx % BATCH_COLORS.length]);
  });
  return map;
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
  cocktail: 'Koktajl',
};

export const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  second_breakfast: '🥣',
  lunch: '🥗',
  dinner: '🍜',
  snack: '🍎',
  cocktail: '🥤',
};

export const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
export const DAY_NAMES_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
