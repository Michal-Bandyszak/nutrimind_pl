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
  { label: '1 przepis',           d: [false, false, false, false, false, false] },
  { label: '2 przepisy',          d: [false, false, true,  false, false, false] },
  { label: '3 przepisy',          d: [false, true,  false, false, true,  false] },
  { label: '4 przepisy',          d: [false, true,  false, true,  false, true ] },
  { label: 'Każdy dzień inny',    d: [true,  true,  true,  true,  true,  true ] },
];

type Props = {
  config: BatchConfig;
  onChange: (config: BatchConfig) => void;
};

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS: Record<typeof MEAL_KEYS[number], string> = {
  breakfast: 'Śniadanie',
  lunch:     'Obiad',
  dinner:    'Kolacja',
};

export default function BatchConfigPanel({ config, onChange }: Props) {
  function toggleDivider(meal: typeof MEAL_KEYS[number], idx: number) {
    const d = [...config[meal]] as MealDividers;
    d[idx] = !d[idx];
    onChange({ ...config, [meal]: d });
  }

  function applyPreset(d: MealDividers) {
    onChange({ breakfast: [...d] as MealDividers, lunch: [...d] as MealDividers, dinner: [...d] as MealDividers });
  }

  function applyPresetToMeal(meal: typeof MEAL_KEYS[number], d: MealDividers) {
    onChange({ ...config, [meal]: [...d] as MealDividers });
  }

  function applyToAll(meal: typeof MEAL_KEYS[number]) {
    onChange({
      breakfast: [...config[meal]] as MealDividers,
      lunch:     [...config[meal]] as MealDividers,
      dinner:    [...config[meal]] as MealDividers,
    });
  }

  const uniqueGroupCount = (d: MealDividers) => new Set(dividersToGroups(d)).size;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {/* ── Presets ── */}
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Szybki wybór — zastosuj do wszystkich posiłków
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white border border-border text-gray-600 hover:border-teal-400 hover:text-teal-700'
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
            presets={PRESETS}
            onToggle={(idx) => toggleDivider(meal, idx)}
            onApplyPreset={(d) => applyPresetToMeal(meal, d)}
            onApplyToAll={() => applyToAll(meal)}
          />
        ))}
      </div>

      <div className="px-4 py-2.5 bg-gray-50 border-t border-border">
        <p className="text-xs text-gray-400">
          Kliknij <Scissors className="inline w-3 h-3" /> żeby podzielić grupę · Kliknij <Link2 className="inline w-3 h-3" /> żeby połączyć · Dni w tej samej grupie mają ten sam przepis.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function MealRow({
  label,
  dividers,
  groupCount,
  presets,
  onToggle,
  onApplyPreset,
  onApplyToAll,
}: {
  label: string;
  dividers: MealDividers;
  groupCount: number;
  presets: { label: string; d: MealDividers }[];
  onToggle: (idx: number) => void;
  onApplyPreset: (d: MealDividers) => void;
  onApplyToAll: () => void;
}) {
  const groups = dividersToGroups(dividers);

  return (
    <div className="px-4 py-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {label}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {groupCount} {groupCount === 1 ? 'przepis' : groupCount < 5 ? 'przepisy' : 'przepisów'}
          </span>
        </span>
        <button
          onClick={onApplyToAll}
          className="text-xs text-teal-600 hover:text-teal-800 hover:underline shrink-0"
        >
          Zastosuj do wszystkich
        </button>
      </div>

      {/* Day pills + divider buttons */}
      <div className="flex items-center">
        {DAY_SHORT.map((day, dayIdx) => {
          const group = groups[dayIdx];
          const bgCls = GROUP_BG[(group - 1) % GROUP_BG.length];
          const isLastInGroup = dayIdx < 6 && dividers[dayIdx];
          const accentCls = GROUP_ACCENT[(group - 1) % GROUP_ACCENT.length];

          return (
            <div key={day} className="flex items-center">
              {/* Day pill */}
              <div className="flex flex-col items-center gap-0.5">
                <span className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold select-none ${bgCls}`}>
                  {day}
                </span>
                {/* Group indicator underline */}
                <div className={`h-0.5 w-full rounded-full ${accentCls}`} />
              </div>

              {/* Divider button between this and next day */}
              {dayIdx < 6 && (
                <DividerButton
                  active={dividers[dayIdx]}
                  onToggle={() => onToggle(dayIdx)}
                  leftDay={DAY_SHORT[dayIdx]}
                  rightDay={DAY_SHORT[dayIdx + 1]}
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

function DividerButton({
  active,
  onToggle,
  leftDay,
  rightDay,
}: {
  active: boolean;
  onToggle: () => void;
  leftDay: string;
  rightDay: string;
}) {
  return (
    <button
      onClick={onToggle}
      title={active ? `Połącz ${leftDay} i ${rightDay} w jedną grupę` : `Podziel: ${leftDay} i ${rightDay} mają różne przepisy`}
      className="group flex items-center justify-center mx-0.5"
      style={{ width: 28, height: 44 }}
    >
      {active ? (
        /* ── SPLIT active — click to MERGE ── */
        <div className="relative flex flex-col items-center gap-0 w-full h-full justify-center">
          {/* vertical bar */}
          <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-red-300 rounded-full transition-colors" />
          {/* icon overlay in the middle */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-white rounded-full p-0.5 shadow-sm">
              <Link2 size={11} className="text-red-400" />
            </span>
          </div>
        </div>
      ) : (
        /* ── NO split — click to SPLIT ── */
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-0.5 h-5 bg-gray-200 border-l border-dashed border-gray-200 group-hover:bg-teal-300 rounded-full transition-all group-hover:h-8" />
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-white rounded-full p-0.5 shadow-sm">
              <Scissors size={11} className="text-teal-500 rotate-90" />
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
