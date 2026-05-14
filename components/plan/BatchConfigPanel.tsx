'use client';

import type { BatchConfig, MealDividers } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';

const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

const GROUP_BG = [
  'bg-teal-100 text-teal-800 dark:text-teal-700',
  'bg-amber-100 text-amber-800 dark:text-amber-700',
  'bg-sky-100 text-sky-800 dark:text-sky-700',
  'bg-rose-100 text-rose-800 dark:text-rose-700',
  'bg-violet-100 text-violet-800 dark:text-violet-700',
  'bg-orange-100 text-orange-800 dark:text-orange-700',
  'bg-green-100 text-green-800 dark:text-green-700',
];

const GROUP_ACCENT = [
  'bg-teal-400 dark:bg-teal-600',
  'bg-amber-400 dark:bg-amber-600',
  'bg-sky-400 dark:bg-sky-600',
  'bg-rose-400 dark:bg-rose-600',
  'bg-violet-400 dark:bg-violet-600',
  'bg-orange-400 dark:bg-orange-600',
  'bg-green-500 dark:bg-green-700',
];

const PRESETS: { label: string; description: string; d: MealDividers }[] = [
  { label: 'Cały tydzień',    description: 'Pon-Ndz',                  d: [false, false, false, false, false, false] },
  { label: 'Dwa bloki',       description: 'Pon-Śr · Czw-Ndz',         d: [false, false, true,  false, false, false] },
  { label: 'Trzy bloki',      description: 'Pon-Wt · Śr-Pt · Sob-Ndz', d: [false, true,  false, false, true,  false] },
  { label: 'Weekend osobno',  description: 'Pon-Pt · Sob-Ndz',         d: [false, false, false, false, true,  false] },
  { label: 'Codziennie inny', description: '7 osobnych dni',           d: [true,  true,  true,  true,  true,  true ] },
];

type Props = {
  config: BatchConfig;
  onChange: (config: BatchConfig) => void;
};

const MEAL_KEYS = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'cocktail'] as const;
type MealKey = typeof MEAL_KEYS[number];
const MEAL_LABELS: Record<typeof MEAL_KEYS[number], string> = {
  breakfast:        'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch:            'Obiad',
  dinner:           'Kolacja',
  cocktail:         'Koktajl',
};

export default function BatchConfigPanel({ config, onChange }: Props) {
  function toggleDivider(meal: MealKey, idx: number) {
    const d = [...config[meal]] as MealDividers;
    d[idx] = !d[idx];
    onChange({ ...config, [meal]: d });
  }

  function applyPreset(d: MealDividers) {
    const newConfig = {} as BatchConfig;
    for (const key of MEAL_KEYS) newConfig[key] = [...d] as MealDividers;
    onChange(newConfig);
  }

  function applyToAll(meal: MealKey) {
    const newConfig = {} as BatchConfig;
    for (const key of MEAL_KEYS) newConfig[key] = [...config[meal]] as MealDividers;
    onChange(newConfig);
  }

  const uniqueGroupCount = (d: MealDividers) => new Set(dividersToGroups(d)).size;

  return (
    <div className="panel-surface overflow-hidden rounded-[1.5rem]">
      <div className="border-b border-border bg-gray-50/80 px-4 py-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Układ dni
        </p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {PRESETS.map((p) => {
            const active = MEAL_KEYS.every(
              (k) => JSON.stringify(config[k]) === JSON.stringify(p.d),
            );
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.d)}
                title={p.label}
                className={`rounded-xl px-3 py-2 text-left transition-all ${
                  active
                    ? 'bg-teal-800 text-white shadow-sm ring-1 ring-teal-900/10'
                    : 'btn-secondary'
                }`}
              >
                <span className="block text-xs font-semibold leading-tight">{p.label}</span>
                <span className={`mt-0.5 block text-[11px] leading-tight ${active ? 'text-white/75' : 'text-gray-400'}`}>
                  {p.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-border">
        {MEAL_KEYS.map((meal) => (
          <MealRow
            key={meal}
            label={MEAL_LABELS[meal]}
            dividers={config[meal]}
            groupCount={uniqueGroupCount(config[meal])}
            onToggle={(idx) => toggleDivider(meal, idx)}
            onApplyToAll={() => applyToAll(meal)}
          />
        ))}
      </div>
    </div>
  );
}

function MealRow({
  label,
  dividers,
  groupCount,
  onToggle,
  onApplyToAll,
}: {
  label: string;
  dividers: MealDividers;
  groupCount: number;
  onToggle: (idx: number) => void;
  onApplyToAll: () => void;
}) {
  const segments = buildSegments(dividers);

  return (
    <div className="space-y-2.5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">
          {label}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {formatBlockCount(groupCount)}
          </span>
        </span>
        <button
          onClick={onApplyToAll}
          className="shrink-0 text-xs text-teal-600 hover:text-teal-800 hover:underline"
        >
          Zastosuj wszędzie
        </button>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        {segments.map((segment, segmentIdx) => {
          const bgCls = GROUP_BG[(segment.group - 1) % GROUP_BG.length];
          const accentCls = GROUP_ACCENT[(segment.group - 1) % GROUP_ACCENT.length];
          const isLastSegment = segmentIdx === segments.length - 1;

          return (
            <div key={`${segment.start}-${segment.end}`} className="flex min-w-[10.5rem] flex-1 items-stretch gap-2">
              <div
                className={`flex-1 rounded-xl border border-border px-3 py-2.5 shadow-sm ${bgCls}`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-tight">{segment.label}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-current/65">
                      {segment.dayCount} {segment.dayCount === 1 ? 'dzień' : 'dni'}
                    </span>
                  </div>

                  <span className={`mt-2 h-0.5 rounded-full ${accentCls}`} />

                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(
                      { length: segment.end - segment.start + 1 },
                      (_, offset) => segment.start + offset,
                    ).map((dayIdx) => (
                      <span
                        key={dayIdx}
                        className="rounded-lg bg-white/55 px-2 py-0.5 text-[11px] font-semibold text-current/75 ring-1 ring-white/45 dark:bg-white/5 dark:ring-white/10"
                      >
                        {DAY_SHORT[dayIdx]}
                      </span>
                    ))}
                  </div>

                  {segment.dayCount > 1 && (
                    <SplitSelect
                      segment={segment}
                      onSplit={(dividerIdx) => onToggle(dividerIdx)}
                    />
                  )}
                </div>
              </div>

              {!isLastSegment && (
                <MergeButton
                  onToggle={() => onToggle(segment.end)}
                  leftLabel={segment.label}
                  rightLabel={segments[segmentIdx + 1].label}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatBlockCount(groupCount: number) {
  if (groupCount === 1) return '1 blok';
  if (groupCount % 10 >= 2 && groupCount % 10 <= 4 && (groupCount % 100 < 10 || groupCount % 100 >= 20)) {
    return `${groupCount} bloki`;
  }
  return `${groupCount} bloków`;
}

function buildSegments(dividers: MealDividers) {
  const segments: { start: number; end: number; group: number; label: string; dayCount: number }[] = [];
  let start = 0;

  for (let i = 0; i < dividers.length; i++) {
    if (dividers[i]) {
      segments.push({
        start,
        end: i,
        group: segments.length + 1,
        label: formatDayRange(start, i),
        dayCount: i - start + 1,
      });
      start = i + 1;
    }
  }

  segments.push({
    start,
    end: 6,
    group: segments.length + 1,
    label: formatDayRange(start, 6),
    dayCount: 7 - start,
  });

  return segments;
}

function formatDayRange(start: number, end: number) {
  return start === end ? DAY_SHORT[start] : `${DAY_SHORT[start]}-${DAY_SHORT[end]}`;
}

type Segment = ReturnType<typeof buildSegments>[number];

function SplitSelect({
  segment,
  onSplit,
}: {
  segment: Segment;
  onSplit: (dividerIdx: number) => void;
}) {
  return (
    <label className="mt-2 block">
      <span className="sr-only">Podziel blok {segment.label}</span>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onSplit(Number(e.target.value));
        }}
        className="w-full rounded-lg border border-white/45 bg-white/60 px-2 py-1.5 text-xs font-medium text-current/80 shadow-sm outline-none transition focus:border-white focus:ring-2 focus:ring-white/25 dark:border-white/10 dark:bg-white/5"
      >
        <option value="">Podziel blok...</option>
        {Array.from(
          { length: segment.end - segment.start },
          (_, offset) => segment.start + offset,
        ).map((dividerIdx) => (
          <option key={dividerIdx} value={dividerIdx}>
            Po {DAY_SHORT[dividerIdx]}
          </option>
        ))}
      </select>
    </label>
  );
}

function MergeButton({
  onToggle,
  leftLabel,
  rightLabel,
}: {
  onToggle: () => void;
  leftLabel: string;
  rightLabel: string;
}) {
  const label = `Połącz ${leftLabel} i ${rightLabel} w jeden blok`;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className="inline-flex min-h-12 w-14 shrink-0 items-center justify-center self-center rounded-xl border border-teal-200 bg-teal-50 px-2 text-[11px] font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100"
    >
      Połącz
    </button>
  );
}
