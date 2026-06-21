'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { SlidersHorizontal, Check, X, Loader2 } from 'lucide-react';
import type { MealPlanWithMeals, BatchConfig, MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
import { buildPlanNutritionDiagnostics, DAILY_KCAL_TOLERANCE } from '@/lib/utils/planNutrition';
import { planToBatchConfig } from '@/lib/utils/planUtils';
import BatchConfigPanel from './BatchConfigPanel';
import WeekGrid from './WeekGrid';
import AddMealModal from './AddMealModal';

type DragState = { dayOfWeek: number; mealType: string } | null;
type AddMealTarget = { dayOfWeek: number; mealType: string } | null;

type Props = { plan: MealPlanWithMeals; targetKcalPerPerson: number };

async function readApiError(res: Response, fallback: string) {
  try {
    const json = await res.json();
    return typeof json.error === 'string' ? json.error : fallback;
  } catch {
    return fallback;
  }
}

export default function PlanView({ plan: initialPlan, targetKcalPerPerson }: Props) {
  const [plan, setPlan] = useState<MealPlanWithMeals>(initialPlan);
  // Track last confirmed (server-synced) plan state for accurate reverts
  const confirmedPlan = useRef<MealPlanWithMeals>(initialPlan);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragged, setDragged] = useState<DragState>(null);
  const [dragOver, setDragOver] = useState<DragState>(null);

  // ── Add meal state ────────────────────────────────────────────────────────
  const [addMealTarget, setAddMealTarget] = useState<AddMealTarget>(null);

  // ── Rebatch state ─────────────────────────────────────────────────────────
  const [showRebatch, setShowRebatch] = useState(false);
  const [rebatchConfig, setRebatchConfig] = useState<BatchConfig>(() =>
    planToBatchConfig(initialPlan),
  );
  const [rebatchLoading, setRebatchLoading] = useState(false);
  const [rebatchError, setRebatchError] = useState<string | null>(null);
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const diagnostics = useMemo(
    () => buildPlanNutritionDiagnostics(plan, targetKcalPerPerson, DAILY_KCAL_TOLERANCE),
    [plan, targetKcalPerPerson],
  );

  // Open rebatch panel: always re-sync config from current plan
  function openRebatch() {
    setRebatchConfig(planToBatchConfig(plan));
    setRebatchError(null);
    setPlanActionError(null);
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
      if (!res.ok) throw new Error(await readApiError(res, 'Błąd zmiany grupowania.'));
      const json = await res.json();
      const updated = json.data as MealPlanWithMeals;
      setPlan(updated);
      confirmedPlan.current = updated;
      setPlanActionError(null);
      setShowRebatch(false);
    } catch (e) {
      setRebatchError(e instanceof Error ? e.message : 'Spróbuj ponownie.');
    } finally {
      setRebatchLoading(false);
    }
  }

  // ── Replace handler ───────────────────────────────────────────────────────
  const handleReplace = useCallback(
    async (meal: MealWithRecipe, newRecipe: RecipeWithIngredients) => {
      setPlanActionError(null);
      // Optimistic update across batch group (or single meal)
      setPlan((prev) => ({
        ...prev,
        meals: prev.meals.map((m) => {
          if (meal.batchGroupId && m.batchGroupId === meal.batchGroupId)
            return { ...m, recipe: newRecipe, recipeId: newRecipe.id };
          if (!meal.batchGroupId && m.id === meal.id)
            return { ...m, recipe: newRecipe, recipeId: newRecipe.id };
          return m;
        }),
      }));

      const res = await fetch(`/api/meal-plans/${plan.id}/replace`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealId: meal.id,
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
          newRecipeId: newRecipe.id,
        }),
      });

      if (!res.ok) {
        const message = await readApiError(res, 'Nie udało się zamienić przepisu.');
        setPlan(confirmedPlan.current);
        setPlanActionError(message);
        throw new Error(message);
      } else {
        setPlanActionError(null);
        setPlan((cur) => { confirmedPlan.current = cur; return cur; });
      }
    },
    [plan.id],
  );

  // ── Add meal handler ──────────────────────────────────────────────────────
  const handleAddMeal = useCallback(
    async (dayOfWeek: number, mealType: string, servings: number, recipe: RecipeWithIngredients) => {
      const res = await fetch(`/api/meal-plans/${plan.id}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, recipeId: recipe.id, mealType, servings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Błąd dodawania.');
      setPlan((prev) => {
        const updated = { ...prev, meals: [...prev.meals, json.data as MealWithRecipe] };
        confirmedPlan.current = updated;
        return updated;
      });
    },
    [plan.id],
  );

  // ── Delete meal handler ───────────────────────────────────────────────────
  const handleDeleteMeal = useCallback(
    async (meal: MealWithRecipe) => {
      setPlan((prev) => ({ ...prev, meals: prev.meals.filter((m) => m.id !== meal.id) }));
      const res = await fetch(`/api/meal-plans/${plan.id}/meals/${meal.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setPlan(confirmedPlan.current);
      } else {
        setPlan((cur) => { confirmedPlan.current = cur; return cur; });
      }
    },
    [plan.id],
  );

  const handlePortionChange = useCallback(
    async (meal: MealWithRecipe, participantId: string, servings: number) => {
      const res = await fetch(`/api/meal-plans/${plan.id}/meals/${meal.id}/portions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, servings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Nie udało się zmienić porcji.');
      const updated = json.data as MealPlanWithMeals;
      setPlan(updated);
      confirmedPlan.current = updated;
    },
    [plan.id],
  );

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
    async (targetDay: number, targetMealType: string) => {
      setPlanActionError(null);
      if (!dragged) { setDragged(null); setDragOver(null); return; }
      // Prevent drop on itself (same day + same type)
      if (dragged.dayOfWeek === targetDay && dragged.mealType === targetMealType) {
        setDragged(null);
        setDragOver(null);
        return;
      }

      const sourceDay = dragged.dayOfWeek;
      const sourceMealType = dragged.mealType;
      setDragged(null);
      setDragOver(null);

      // Optimistic update: swap recipes across batch groups (supports cross-type)
      setPlan((prev) => {
        const sourceMeal = prev.meals.find(
          (m) => m.dayOfWeek === sourceDay && m.mealType === sourceMealType,
        );
        const targetMeal = prev.meals.find(
          (m) => m.dayOfWeek === targetDay && m.mealType === targetMealType,
        );
        if (!sourceMeal || !targetMeal) return prev;

        const sourceRecipe = sourceMeal.recipe;
        const targetRecipe = targetMeal.recipe;
        const sourceBatch = sourceMeal.batchGroupId;
        const targetBatch = targetMeal.batchGroupId;

        return {
          ...prev,
          meals: prev.meals.map((m) => {
            if (m.mealType === sourceMealType) {
              if (sourceBatch && m.batchGroupId === sourceBatch)
                return { ...m, recipe: targetRecipe, recipeId: targetRecipe.id };
              if (!sourceBatch && m.dayOfWeek === sourceDay)
                return { ...m, recipe: targetRecipe, recipeId: targetRecipe.id };
            }
            if (m.mealType === targetMealType) {
              if (targetBatch && m.batchGroupId === targetBatch)
                return { ...m, recipe: sourceRecipe, recipeId: sourceRecipe.id };
              if (!targetBatch && m.dayOfWeek === targetDay)
                return { ...m, recipe: sourceRecipe, recipeId: sourceRecipe.id };
            }
            return m;
          }),
        };
      });

      const res = await fetch(`/api/meal-plans/${plan.id}/swap`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDayOfWeek: sourceDay,
          sourceMealType,
          targetDayOfWeek: targetDay,
          targetMealType,
        }),
      });

      if (!res.ok) {
        const message = await readApiError(res, 'Nie udało się zamienić posiłków.');
        setPlan(confirmedPlan.current);
        setPlanActionError(message);
      } else {
        setPlanActionError(null);
        setPlan((cur) => { confirmedPlan.current = cur; return cur; });
      }
    },
    [dragged, plan.id],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const currentAddMealTarget = addMealTarget;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {planActionError ? (
          <p className="text-xs font-medium text-red-500">{planActionError}</p>
        ) : (
          <PlanDiagnostics diagnostics={diagnostics} />
        )}
        <button
          onClick={openRebatch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-medium transition-all ${
            showRebatch
              ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm'
              : 'btn-secondary'
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
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium active:scale-95 transition-all disabled:opacity-60"
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
              className="btn-secondary flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium transition disabled:opacity-50"
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
        targetKcalPerPerson={targetKcalPerPerson}
        dragged={dragged}
        dragOver={dragOver}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        onReplace={handleReplace}
        onAddMeal={(dayOfWeek, mealType) => setAddMealTarget({ dayOfWeek, mealType })}
        onDeleteMeal={handleDeleteMeal}
        onPortionChange={handlePortionChange}
      />

      {/* Add meal modal */}
      {currentAddMealTarget !== null && (
        <AddMealModal
          dayOfWeek={currentAddMealTarget.dayOfWeek}
          mealType={currentAddMealTarget.mealType}
          participantCount={plan.participants.length}
          onClose={() => setAddMealTarget(null)}
          onAdd={(recipe, mealType, servings) =>
            handleAddMeal(currentAddMealTarget.dayOfWeek, mealType, servings, recipe)
          }
        />
      )}
    </div>
  );
}

function PlanDiagnostics({
  diagnostics,
}: {
  diagnostics: ReturnType<typeof buildPlanNutritionDiagnostics>;
}) {
  const outsideText = diagnostics.daysOutsideTolerance === 0
    ? 'dni w celu'
    : `${diagnostics.daysOutsideTolerance} poza celem`;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
      <span className="rounded-full border border-border bg-white/70 px-2.5 py-1 font-medium text-gray-500">
        Śr. {diagnostics.averageKcal.toLocaleString('pl-PL')} kcal
      </span>
      <span className="rounded-full border border-border bg-white/70 px-2.5 py-1">
        {diagnostics.minKcal.toLocaleString('pl-PL')}–{diagnostics.maxKcal.toLocaleString('pl-PL')} kcal
      </span>
      <span className={`rounded-full border px-2.5 py-1 ${
        diagnostics.daysOutsideTolerance
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-teal-200 bg-teal-50 text-teal-700'
      }`}>
        {outsideText}
      </span>
      <span className="rounded-full border border-border bg-white/70 px-2.5 py-1">
        {diagnostics.batchCount} batchy
      </span>
      {diagnostics.participants.map((participant) => (
        <span key={participant.id} className="rounded-full border border-border bg-white/70 px-2.5 py-1">
          {participant.name}: śr. {participant.averageKcal.toLocaleString('pl-PL')} / {participant.targetKcal.toLocaleString('pl-PL')} kcal
        </span>
      ))}
      {diagnostics.participants.some((participant) => {
        const missing = participant.targetKcal - participant.averageKcal;
        return missing >= 100 && missing <= 200;
      }) && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
          Opcjonalnie: oliwa, orzechy lub pestki +100–200 kcal
        </span>
      )}
    </div>
  );
}
