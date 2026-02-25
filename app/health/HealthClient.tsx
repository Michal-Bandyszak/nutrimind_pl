'use client';

import { useState, useRef, useCallback } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  MORNING_ROUTINE,
  EVENING_ROUTINE,
  POINTS_CATEGORIES,
  HEALTH_TIPS,
  type RoutineItem,
  type PointsCategory,
} from '@/lib/data/healthData';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LogState = {
  morningDone: string[];
  eveningDone: string[];
  waterGlasses: number;
  sleepH: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
  moodLevel: number | null;
  pointsDiet: number | null;
  pointsSupp: number | null;
  pointsTrain: number | null;
  pointsRoutine: number | null;
  pointsRelax: number | null;
  pointsMindset: number | null;
};

type Props = {
  date: string;
  initialLog: LogState | null;
};

function emptyLog(): LogState {
  return {
    morningDone: [],
    eveningDone: [],
    waterGlasses: 0,
    sleepH: null,
    sleepQuality: null,
    energyLevel: null,
    moodLevel: null,
    pointsDiet: null,
    pointsSupp: null,
    pointsTrain: null,
    pointsRoutine: null,
    pointsRelax: null,
    pointsMindset: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function HealthClient({ date, initialLog }: Props) {
  const [tab, setTab] = useState<'today' | 'tips'>('today');
  const [log, setLog] = useState<LogState>(initialLog ?? emptyLog());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const save = useCallback(
    async (data: LogState) => {
      setSaving(true);
      try {
        await fetch(`/api/health/${date}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } catch {
        // silent
      } finally {
        setSaving(false);
      }
    },
    [date],
  );

  function immediateUpdate(patch: Partial<LogState>) {
    const updated = { ...log, ...patch };
    setLog(updated);
    clearTimeout(debounceRef.current);
    save(updated);
  }

  function debouncedUpdate(patch: Partial<LogState>) {
    const updated = { ...log, ...patch };
    setLog(updated);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(updated), 600);
  }

  function toggleRoutineItem(field: 'morningDone' | 'eveningDone', id: string) {
    const current = log[field];
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    immediateUpdate({ [field]: updated });
  }

  const totalPoints = [
    log.pointsDiet, log.pointsSupp, log.pointsTrain,
    log.pointsRoutine, log.pointsRelax, log.pointsMindset,
  ].reduce<number>((s, v) => s + (v ?? 0), 0);

  const morningPct = Math.round((log.morningDone.length / MORNING_ROUTINE.length) * 100);
  const eveningPct = Math.round((log.eveningDone.length / EVENING_ROUTINE.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-start justify-between px-4 lg:px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Zdrowie</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(date + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400">Zapisuję…</span>}
            {saved && !saving && <span className="text-xs text-teal-600 font-medium flex items-center gap-1"><Check size={12} /> Zapisano</span>}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-border">
          {(['today', 'tips'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-teal-700 border-b-2 border-teal-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'today' ? 'Dziś' : 'Porady'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-6">
        {tab === 'today' ? (
          <TodayTab
            log={log}
            morningPct={morningPct}
            eveningPct={eveningPct}
            totalPoints={totalPoints}
            onToggleMorning={(id) => toggleRoutineItem('morningDone', id)}
            onToggleEvening={(id) => toggleRoutineItem('eveningDone', id)}
            onMetricChange={(patch) => debouncedUpdate(patch)}
            onPointChange={(patch) => immediateUpdate(patch)}
          />
        ) : (
          <TipsTab />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Today tab
// ─────────────────────────────────────────────────────────────────────────────

type TodayTabProps = {
  log: LogState;
  morningPct: number;
  eveningPct: number;
  totalPoints: number;
  onToggleMorning: (id: string) => void;
  onToggleEvening: (id: string) => void;
  onMetricChange: (patch: Partial<LogState>) => void;
  onPointChange: (patch: Partial<LogState>) => void;
};

function TodayTab({
  log, morningPct, eveningPct, totalPoints,
  onToggleMorning, onToggleEvening, onMetricChange, onPointChange,
}: TodayTabProps) {
  return (
    <div className="space-y-6">
      {/* Morning routine */}
      <Section
        title="Rutyna poranna"
        badge={`${log.morningDone.length}/${MORNING_ROUTINE.length}`}
        pct={morningPct}
        color="amber"
      >
        <RoutineList
          items={MORNING_ROUTINE}
          done={log.morningDone}
          onToggle={onToggleMorning}
        />
      </Section>

      {/* Evening routine */}
      <Section
        title="Rutyna wieczorna"
        badge={`${log.eveningDone.length}/${EVENING_ROUTINE.length}`}
        pct={eveningPct}
        color="violet"
      >
        <RoutineList
          items={EVENING_ROUTINE}
          done={log.eveningDone}
          onToggle={onToggleEvening}
        />
      </Section>

      {/* Daily metrics */}
      <Section title="Pomiary dnia" color="teal">
        <div className="space-y-4">
          {/* Water */}
          <div>
            <p className="text-xs text-gray-500 mb-2">💧 Woda (szklanki)</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => onMetricChange({ waterGlasses: log.waterGlasses === n ? 0 : n })}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    n <= log.waterGlasses
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {(log.waterGlasses ?? 0) > 0 ? `${(log.waterGlasses ?? 0) * 250} ml` : 'Kliknij żeby ustawić'}
            </p>
          </div>

          {/* Sleep */}
          <div>
            <p className="text-xs text-gray-500 mb-2">😴 Sen (godziny)</p>
            <div className="flex gap-1.5 flex-wrap">
              {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((h) => (
                <button
                  key={h}
                  onClick={() => onMetricChange({ sleepH: log.sleepH === h ? null : h })}
                  className={`px-2.5 h-8 rounded-lg text-xs font-semibold transition-all ${
                    log.sleepH === h
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Energy + Mood */}
          <div className="grid grid-cols-2 gap-4">
            <ScaleSelector
              label="⚡ Energia"
              value={log.energyLevel}
              onChange={(v) => onMetricChange({ energyLevel: v })}
              colors={['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500']}
            />
            <ScaleSelector
              label="😊 Nastrój"
              value={log.moodLevel}
              onChange={(v) => onMetricChange({ moodLevel: v })}
              colors={['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500']}
            />
          </div>

          {/* Sleep quality */}
          <ScaleSelector
            label="⭐ Jakość snu"
            value={log.sleepQuality}
            onChange={(v) => onMetricChange({ sleepQuality: v })}
            colors={['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500']}
            labels={['Koszmar', 'Słabo', 'OK', 'Dobrze', 'Idealnie']}
          />
        </div>
      </Section>

      {/* Points system */}
      <Section
        title="Punkty dnia — Strategia 1%"
        badge={`${totalPoints}/18`}
        color="teal"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Etap 1: max 6 pkt · Etap 2: max 12 pkt · Etap 3: max 18 pkt
          </p>
          {POINTS_CATEGORIES.map((cat) => {
            const key = `points${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}` as keyof LogState;
            const val = log[key] as number | null;
            return (
              <PointsRow
                key={cat.id}
                category={cat}
                value={val}
                onChange={(v) => onPointChange({ [key]: v })}
              />
            );
          })}

          {totalPoints > 0 && (
            <div className="pt-2 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${(totalPoints / 18) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-teal-700 tabular-nums">
                {Math.round((totalPoints / 18) * 100)}%
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Routine checklist
// ─────────────────────────────────────────────────────────────────────────────

function RoutineList({ items, done, onToggle }: { items: RoutineItem[]; done: string[]; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const checked = done.includes(item.id);
        const isExpanded = expanded === item.id;
        return (
          <li key={item.id} className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-start gap-3 p-3">
              <button
                onClick={() => onToggle(item.id)}
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  checked
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-gray-300 hover:border-teal-400'
                }`}
              >
                {checked && <Check size={11} strokeWidth={3} />}
              </button>
              <span className={`flex-1 text-sm leading-snug transition-colors ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </span>
              {item.detail && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
            </div>
            {item.detail && isExpanded && (
              <div className="px-3 pb-3 pt-0">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{item.detail}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Points row
// ─────────────────────────────────────────────────────────────────────────────

function PointsRow({ category, value, onChange }: { category: PointsCategory; value: number | null; onChange: (v: number | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex-1 text-sm font-medium text-gray-700">{category.label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onChange(value === n ? null : n)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                (value ?? 0) >= n
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 hover:bg-teal-100 hover:text-teal-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-300 hover:text-gray-500 transition-colors"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-1">
          {category.levels.map((desc, i) => (
            <p key={i} className={`text-xs flex items-start gap-2 ${(value ?? 0) > i ? 'text-teal-700' : 'text-gray-400'}`}>
              <span className={`shrink-0 w-4 h-4 rounded-full text-[10px] flex items-center justify-center mt-0.5 ${(value ?? 0) > i ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
              {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scale selector (1-5)
// ─────────────────────────────────────────────────────────────────────────────

function ScaleSelector({
  label, value, onChange, colors, labels,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  colors: string[];
  labels?: string[];
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            title={labels?.[n - 1]}
            className={`flex-1 h-8 rounded-lg transition-all ${
              value === n
                ? `${colors[n - 1]} text-white shadow-sm scale-105`
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          />
        ))}
      </div>
      {value && labels && (
        <p className="text-xs text-gray-400 mt-1">{labels[value - 1]}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_COLORS = {
  teal:   { bar: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700' },
  amber:  { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700' },
  violet: { bar: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700' },
};

function Section({
  title, badge, pct, color = 'teal', children,
}: {
  title: string;
  badge?: string;
  pct?: number;
  color?: keyof typeof SECTION_COLORS;
  children: React.ReactNode;
}) {
  const c = SECTION_COLORS[color];
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <div className="flex items-center gap-2">
          {pct !== undefined && (
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
          )}
          {badge && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{badge}</span>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tips tab
// ─────────────────────────────────────────────────────────────────────────────

function TipsTab() {
  const [openCat, setOpenCat] = useState<string | null>('sleep');

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 pb-1">
        Oparte na materiałach Sports-Med: Strategia 1%, Rutyny na Stabilizację Dopaminy, Złota Piątka.
      </p>
      {HEALTH_TIPS.map((cat) => {
        const isOpen = openCat === cat.id;
        return (
          <div key={cat.id} className="bg-white rounded-2xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/50 transition-colors"
              onClick={() => setOpenCat(isOpen ? null : cat.id)}
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="flex-1 text-sm font-semibold text-gray-800">{cat.label}</span>
              <span className="text-xs text-gray-400">{cat.tips.length} porad</span>
              {isOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
            </button>
            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {cat.tips.map((tip, i) => (
                  <div key={i} className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-800 mb-1">{tip.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{tip.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
