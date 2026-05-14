'use client';

import type { BatchConfig, MealDividers } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';

const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const DAY_BOUNDARIES = ['Pon-Wt', 'Wt-Śr', 'Śr-Czw', 'Czw-Pt', 'Pt-Sob', 'Sob-Ndz'];

const GROUP_BG = [
  'bg-teal-100 text-teal-800 dark:text-teal-700',
  'bg-amber-100 text-amber-800 dark:text-amber-700',
  'bg-sky-100 text-sky-800 dark:text-sky-700',
  'bg-rose-100 text-rose-800 dark:text-rose-700',
  'bg-violet-100 text-violet-800 dark:text-violet-700',
  'bg-orange-100 text-orange-800 dark:text-orange-700',
  'bg-green-100 text-green-800 dark:text-green-700',
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
                type="button"
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
  const groups = dividersToGroups(dividers);

  return (
    <div className="space-y-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">
          {label}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {formatBlockCount(groupCount)}
          </span>
        </span>
        <button
          type="button"
          onClick={onApplyToAll}
          className="shrink-0 text-xs text-teal-600 hover:text-teal-800 hover:underline"
        >
          Zastosuj wszędzie
        </button>
      </div>

      <DayTimeline groups={groups} />
      <BoundaryControls dividers={dividers} onToggle={onToggle} />
    </div>
  );
}

function DayTimeline({ groups }: { groups: number[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DAY_SHORT.map((day, idx) => {
        const group = groups[idx] ?? 1;
        const bgCls = GROUP_BG[(group - 1) % GROUP_BG.length];

        return (
          <div
            key={day}
            className={`min-h-14 rounded-xl border border-border px-1.5 py-2 text-center shadow-sm ${bgCls}`}
          >
            <span className="block text-xs font-semibold leading-tight">{day}</span>
            <span className="mt-1 block text-[10px] font-medium leading-tight text-current/65">
              blok {group}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BoundaryControls({
  dividers,
  onToggle,
}: {
  dividers: MealDividers;
  onToggle: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Łączenia dni
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {dividers.map((isSplit, idx) => {
          const action = isSplit ? 'Połącz' : 'Rozdziel';
          const label = `${action} ${DAY_BOUNDARIES[idx]}`;

          return (
            <button
              key={DAY_BOUNDARIES[idx]}
              type="button"
              aria-pressed={isSplit}
              aria-label={label}
              title={label}
              onClick={() => onToggle(idx)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                isSplit
                  ? 'border-teal-300 bg-teal-50 text-teal-800 ring-1 ring-teal-100 hover:bg-teal-100'
                  : 'border-border bg-white/70 text-gray-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              <span className="block text-xs font-semibold leading-tight">{action}</span>
              <span className="mt-0.5 block text-[11px] font-medium leading-tight text-current/70">
                {DAY_BOUNDARIES[idx]}
              </span>
            </button>
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
