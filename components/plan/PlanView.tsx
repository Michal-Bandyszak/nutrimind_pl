'use client';

import { useState, useCallback } from 'react';
import { SlidersHorizontal, Check, X, Loader2 } from 'lucide-react';
import type { MealPlanWithMeals, BatchConfig } from '@/lib/types';
import { planToBatchConfig } from '@/lib/utils/planUtils';
import BatchConfigPanel from './BatchConfigPanel';
import WeekGrid from './WeekGrid';

type DragState = { dayOfWeek: number; mealType: string } | null;

type Props = { plan: MealPlanWithMeals };

export default function PlanView({ plan: initialPlan }: Props) {
  const [plan, setPlan] = useState<MealPlanWithMeals>(initialPlan);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragged, setDragged] = useState<DragState>(null);
  const [dragOver, setDragOver] = useState<DragState>(null);

  // ── Rebatch state ─────────────────────────────────────────────────────────
  const [showRebatch, setShowRebatch] = useState(false);
  const [rebatchConfig, setRebatchConfig] = useState<BatchConfig>(() =>
    planToBatchConfig(initialPlan),
  );
  const [rebatchLoading, setRebatchLoading] = useState(false);
  const [rebatchError, setRebatchError] = useState<string | null>(null);

  // Open rebatch panel: always re-sync config from current plan
  function openRebatch() {
    setRebatchConfig(planToBatchConfig(plan));
    setRebatchError(null);
    setShowRebatch(true);
  }

  async function applyRebatch() {
    setRebatchLoading(true);
    setRebatchError(null);
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/rebatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: rebatchConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Błąd zmiany grupowania.');
      setPlan(json.data as MealPlanWithMeals);
      setShowRebatch(false);
    } catch (e) {
      setRebatchError(e instanceof Error ? e.message : 'Spróbuj ponownie.');
    } finally {
      setRebatchLoading(false);
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((dayOfWeek: number, mealType: string) => {
    setDragged({ dayOfWeek, mealType });
  }, []);

  const handleDragOver = useCallback((dayOfWeek: number, mealType: string) => {
    setDragOver({ dayOfWeek, mealType });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragged(null);
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    async (targetDay: number, mealType: string) => {
      if (!dragged || dragged.mealType !== mealType || dragged.dayOfWeek === targetDay) {
        setDragged(null);
        setDragOver(null);
        return;
      }

      const sourceDay = dragged.dayOfWeek;
      setDragged(null);
      setDragOver(null);

      // Optimistic update: swap recipes across batch groups
      setPlan((prev) => {
        const sourceMeal = prev.meals.find(
          (m) => m.dayOfWeek === sourceDay && m.mealType === mealType,
        );
        const targetMeal = prev.meals.find(
          (m) => m.dayOfWeek === targetDay && m.mealType === mealType,
        );
        if (!sourceMeal || !targetMeal) return prev;

        const sourceRecipe = sourceMeal.recipe;
        const targetRecipe = targetMeal.recipe;
        const sourceBatch = sourceMeal.batchGroupId;
        const targetBatch = targetMeal.batchGroupId;

        return {
          ...prev,
          meals: prev.meals.map((m) => {
            if (m.mealType !== mealType) return m;
            if (sourceBatch && m.batchGroupId === sourceBatch)
              return { ...m, recipe: targetRecipe, recipeId: targetRecipe.id };
            if (!sourceBatch && m.dayOfWeek === sourceDay)
              return { ...m, recipe: targetRecipe, recipeId: targetRecipe.id };
            if (targetBatch && m.batchGroupId === targetBatch)
              return { ...m, recipe: sourceRecipe, recipeId: sourceRecipe.id };
            if (!targetBatch && m.dayOfWeek === targetDay)
              return { ...m, recipe: sourceRecipe, recipeId: sourceRecipe.id };
            return m;
          }),
        };
      });

      const res = await fetch(`/api/meal-plans/${plan.id}/swap`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDayOfWeek: sourceDay, targetDayOfWeek: targetDay, mealType }),
      });

      if (!res.ok) {
        // Revert on failure
        setPlan(initialPlan);
      }
    },
    [dragged, plan.id, initialPlan],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={openRebatch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            showRebatch
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-white border-border text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <SlidersHorizontal size={13} />
          Zmień grupowanie
        </button>
      </div>

      {/* Rebatch panel */}
      {showRebatch && (
        <div className="space-y-3">
          <BatchConfigPanel config={rebatchConfig} onChange={setRebatchConfig} />

          <div className="flex items-center gap-2">
            <button
              onClick={applyRebatch}
              disabled={rebatchLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
            >
              {rebatchLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {rebatchLoading ? 'Zapisywanie…' : 'Zastosuj zmiany'}
            </button>

            <button
              onClick={() => { setShowRebatch(false); setRebatchError(null); }}
              disabled={rebatchLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-white text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition disabled:opacity-50"
            >
              <X size={14} />
              Anuluj
            </button>

            {rebatchError && (
              <p className="text-xs text-red-500 ml-1">{rebatchError}</p>
            )}
          </div>
        </div>
      )}

      {/* Week grid */}
      <WeekGrid
        plan={plan}
        dragged={dragged}
        dragOver={dragOver}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
      />
    </div>
  );
}
