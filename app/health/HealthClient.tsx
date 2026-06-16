'use client';

import { useState, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { MORNING_ROUTINE, EVENING_ROUTINE } from '@/lib/data/healthData';
import TodayTab, { type LogState } from './TodayTab';
import TipsTab from './TipsTab';
import HistoryTab from './HistoryTab';

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

export default function HealthClient({ date, initialLog }: Props) {
  const [tab, setTab] = useState<'today' | 'history' | 'tips'>('today');
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
      <div className="glass-header sticky top-0 z-30">
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
          {(['today', 'history', 'tips'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-teal-700 border-b-2 border-teal-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'today' ? 'Dziś' : t === 'history' ? 'Historia' : 'Porady'}
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
        ) : tab === 'history' ? (
          <HistoryTab />
        ) : (
          <TipsTab />
        )}
      </div>
    </div>
  );
}
