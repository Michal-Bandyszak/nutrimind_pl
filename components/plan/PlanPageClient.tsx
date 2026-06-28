'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MealPlanSummary, MealPlanWithMeals } from '@/lib/types';
import PlanView from './PlanView';

type Props = {
  summary: MealPlanSummary;
  targetKcalPerPerson: number;
};

async function readPlan(): Promise<MealPlanWithMeals | null> {
  const res = await fetch('/api/meal-plans/active', { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Nie udało się załadować planu.');
  }
  return (json.data as MealPlanWithMeals | null) ?? null;
}

export default function PlanPageClient({ summary, targetKcalPerPerson }: Props) {
  const [plan, setPlan] = useState<MealPlanWithMeals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await readPlan());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować planu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  if (loading && !plan) {
    return <PlanShellSkeleton summary={summary} />;
  }

  if (error && !plan) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void loadPlan()}
          className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return <PlanView key={plan.id} plan={plan} targetKcalPerPerson={targetKcalPerPerson} />;
}

function PlanShellSkeleton({ summary }: { summary: MealPlanSummary }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="rounded-[1.5rem] border border-border bg-white/70 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {summary.participants.map((participant) => (
            <div
              key={participant.id}
              className="rounded-full bg-teal-50 px-3 py-1.5 text-xs text-teal-700"
            >
              {participant.nameSnapshot} · {participant.targetKcalSnapshot} kcal
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
          >
            <div className="h-3 w-20 rounded-full bg-gray-200" />
            <div className="mt-3 h-5 w-3/4 rounded-full bg-gray-200" />
            <div className="mt-4 space-y-2">
              <div className="h-10 rounded-2xl bg-gray-100" />
              <div className="h-10 rounded-2xl bg-gray-100" />
              <div className="h-10 rounded-2xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
