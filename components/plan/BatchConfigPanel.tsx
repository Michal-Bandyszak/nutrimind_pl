'use client';

import { Scissors, Link2 } from 'lucide-react';
import type { BatchConfig, MealDividers } from '@/lib/types';
import { dividersToGroups } from '@/lib/types';

const DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

const GROUP_BG = [
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-orange-100 text-orange-800',
  'bg-green-100 text-green-800',
];

const GROUP_ACCENT = [
  'bg-teal-400',
  'bg-amber-400',
  'bg-sky-400',
  'bg-rose-400',
  'bg-violet-400',
  'bg-orange-400',
  'bg-green-400',
];

// Quick presets: [label, dividers]
const PRESETS: { label: string; d: MealDividers }[] = [
  { label: '1 gotowanie',          d: [false, false, false, false, false, false] },
  { label: '2 gotowania',          d: [false, false, true,  false, false, false] },
  { label: '3 gotowania',          d: [false, true,  false, false, true,  false] },
  { label: 'Weekend osobno',       d: [false, false, false, false, true,  false] },
  { label: 'Każdy dzień osobno',   d: [true,  true,  true,  true,  true,  true ] },
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
    <div className="panel-surface rounded-[1.5rem] overflow-hidden">
      {/* ── Presets ── */}
      <div className="px-4 py-3 border-b border-border bg-gray-50/80">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Układy
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = MEAL_KEYS.every(
              (k) => JSON.stringify(config[k]) === JSON.stringify(p.d),
            );
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.d)}
                title={p.label}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-teal-800 text-white shadow-sm ring-1 ring-teal-900/10'
                    : 'btn-secondary'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Per-meal editors ── */}
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

// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="px-4 py-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {label}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {formatGroupCount(groupCount)}
          </span>
        </span>
        <button
          onClick={onApplyToAll}
          className="text-xs text-teal-600 hover:text-teal-800 hover:underline shrink-0"
        >
          Zastosuj do wszystkich
        </button>
      </div>

      {/* Group segments + divider buttons */}
      <div className="flex flex-wrap items-stretch gap-1.5">
        {segments.map((segment, segmentIdx) => {
          const bgCls = GROUP_BG[(segment.group - 1) % GROUP_BG.length];
          const accentCls = GROUP_ACCENT[(segment.group - 1) % GROUP_ACCENT.length];
          const isLastSegment = segmentIdx === segments.length - 1;

          return (
            <div key={`${segment.start}-${segment.end}`} className="flex items-stretch gap-1.5">
              <div
                className={`min-w-[5rem] flex-1 rounded-xl border border-border px-3 py-2 shadow-sm ${bgCls}`}
              >
                <div className="flex h-full flex-col justify-center text-center">
                  <span className="text-sm font-semibold leading-tight">{segment.label}</span>
                  <span className={`mt-1 h-0.5 rounded-full ${accentCls}`} />
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-current/65">
                      {segment.dayCount} {segment.dayCount === 1 ? 'dzień' : 'dni'}
                    </span>
                    {segment.dayCount > 1 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from(
                          { length: segment.end - segment.start },
                          (_, offset) => segment.start + offset,
                        ).map((dividerIdx) => (
                          <button
                            key={dividerIdx}
                            type="button"
                            onClick={() => onToggle(dividerIdx)}
                            title={`Podziel po ${DAY_SHORT[dividerIdx]}`}
                            aria-label={`Podziel po ${DAY_SHORT[dividerIdx]}`}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-current/60 hover:bg-white hover:text-teal-700 transition-colors"
                          >
                            <Scissors size={10} className="rotate-90" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isLastSegment && (
                <DividerButton
                  active={dividers[segment.end]}
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

// ─────────────────────────────────────────────────────────────────────────────

function formatGroupCount(groupCount: number) {
  if (groupCount === 1) return '1 grupa';
  if (groupCount % 10 >= 2 && groupCount % 10 <= 4 && (groupCount % 100 < 10 || groupCount % 100 >= 20)) {
    return `${groupCount} grupy`;
  }
  return `${groupCount} grup`;
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

function DividerButton({
  active,
  onToggle,
  leftLabel,
  rightLabel,
}: {
  active: boolean;
  onToggle: () => void;
  leftLabel: string;
  rightLabel: string;
}) {
  const label = active
    ? `Połącz ${leftLabel} i ${rightLabel} w jedną grupę`
    : `Podziel na ${leftLabel} i ${rightLabel}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className={`group inline-flex h-10 w-8 shrink-0 items-center justify-center self-center rounded-full border transition-colors ${
        active
          ? 'border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300 hover:bg-teal-100'
          : 'border-dashed border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
      }`}
    >
      {active ? (
        <Link2 size={13} className="transition-transform group-hover:scale-110" />
      ) : (
        <Scissors size={13} className="rotate-90 transition-transform group-hover:scale-110" />
      )}
    </button>
  );
}
