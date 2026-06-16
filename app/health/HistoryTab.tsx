'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Droplets, Moon, Smile, Zap } from 'lucide-react';
import { EVENING_ROUTINE, MORNING_ROUTINE } from '@/lib/data/healthData';
import type { LogState } from './TodayTab';

export type HealthHistoryEntry = LogState & {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

const POINT_KEYS: Array<keyof LogState> = [
  'pointsDiet',
  'pointsSupp',
  'pointsTrain',
  'pointsRoutine',
  'pointsRelax',
  'pointsMindset',
];

function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function totalPoints(log: LogState): number {
  return POINT_KEYS.reduce((sum, key) => sum + (Number(log[key]) || 0), 0);
}

function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10;
}

function compactNumber(value: number | null): string {
  return value == null ? 'brak' : String(value).replace('.', ',');
}

export default function HistoryTab() {
  const [entries, setEntries] = useState<HealthHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/health/history?limit=45', { cache: 'no-store' });
        if (!res.ok) throw new Error('Nie udało się pobrać historii zdrowia.');
        const body = await res.json();
        if (active) setEntries(Array.isArray(body.data) ? body.data : []);
      } catch {
        if (active) setError('Nie udało się pobrać historii zdrowia.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const last7 = entries.slice(0, 7);
    return {
      loggedDays: entries.length,
      avgSleep: average(last7.map((entry) => entry.sleepH)),
      avgEnergy: average(last7.map((entry) => entry.energyLevel)),
      avgMood: average(last7.map((entry) => entry.moodLevel)),
      avgPoints: average(last7.map((entry) => totalPoints(entry))),
    };
  }, [entries]);

  if (loading) {
    return (
      <div className="panel-surface rounded-[1.5rem] p-5">
        <p className="text-sm text-gray-500">Ładuję historię zdrowia…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-surface rounded-[1.5rem] p-5">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="panel-surface rounded-[1.5rem] p-5 text-center">
        <CalendarDays className="mx-auto mb-3 text-gray-300" size={28} />
        <h2 className="text-sm font-semibold text-gray-800">Brak historii</h2>
        <p className="mt-1 text-xs text-gray-500">
          Pierwszy zapis z zakładki Dziś pojawi się tutaj automatycznie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="panel-surface rounded-[1.25rem] p-4">
          <p className="text-xs text-gray-400">Dni z wpisami</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{summary.loggedDays}</p>
        </div>
        <div className="panel-surface rounded-[1.25rem] p-4">
          <p className="text-xs text-gray-400">Śr. punkty 7 dni</p>
          <p className="mt-1 text-xl font-semibold text-teal-700">
            {compactNumber(summary.avgPoints)}/18
          </p>
        </div>
        <div className="panel-surface rounded-[1.25rem] p-4">
          <p className="text-xs text-gray-400">Śr. sen 7 dni</p>
          <p className="mt-1 text-xl font-semibold text-indigo-700">
            {summary.avgSleep == null ? 'brak' : `${compactNumber(summary.avgSleep)} h`}
          </p>
        </div>
        <div className="panel-surface rounded-[1.25rem] p-4">
          <p className="text-xs text-gray-400">Energia / nastrój</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {compactNumber(summary.avgEnergy)} / {compactNumber(summary.avgMood)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const morningPct = Math.round((entry.morningDone.length / MORNING_ROUTINE.length) * 100);
          const eveningPct = Math.round((entry.eveningDone.length / EVENING_ROUTINE.length) * 100);
          const points = totalPoints(entry);

          return (
            <article key={entry.id} className="panel-surface rounded-[1.5rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{formatDate(entry.date)}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Ostatnia zmiana {new Date(entry.updatedAt).toLocaleDateString('pl-PL')}
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                  {points}/18 pkt
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="rounded-xl bg-white/55 p-3">
                  <p className="font-medium text-gray-500">Poranek</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${morningPct}%` }} />
                  </div>
                  <p className="mt-1 text-gray-400">
                    {entry.morningDone.length}/{MORNING_ROUTINE.length}
                  </p>
                </div>
                <div className="rounded-xl bg-white/55 p-3">
                  <p className="font-medium text-gray-500">Wieczór</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${eveningPct}%` }} />
                  </div>
                  <p className="mt-1 text-gray-400">
                    {entry.eveningDone.length}/{EVENING_ROUTINE.length}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 px-3 py-2 text-blue-700">
                  <Droplets size={14} />
                  {entry.waterGlasses * 250} ml
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50/70 px-3 py-2 text-indigo-700">
                  <Moon size={14} />
                  {entry.sleepH == null ? 'Sen brak' : `${entry.sleepH} h`}
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-lime-50/70 px-3 py-2 text-lime-700">
                  <Zap size={14} />
                  Energia {entry.energyLevel ?? '-'}
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-2 text-rose-700">
                  <Smile size={14} />
                  Nastrój {entry.moodLevel ?? '-'}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
