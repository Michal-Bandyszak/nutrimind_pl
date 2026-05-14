'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { MealPlanWithMeals, DayMeals, MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
import { buildBatchColorMap, DAY_NAMES, DAY_NAMES_FULL, MEAL_TYPE_LABELS } from '@/lib/utils/batchColors';
import type { BatchColor } from '@/lib/utils/batchColors';
import MealCard from './MealCard';
import RecipeModal from './RecipeModal';

type DragState = { dayOfWeek: number; mealType: string } | null;
const CORE_MEAL_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'cocktail'] as const;
const MULTI_MEAL_TYPES = ['snack', 'dessert', 'extra'] as const;

type Props = {
  plan: MealPlanWithMeals;
  dragged: DragState;
  dragOver: DragState;
  onDragStart: (dayOfWeek: number, mealType: string) => void;
  onDragOver: (dayOfWeek: number, mealType: string) => void;
  onDragEnd: () => void;
  onDrop: (targetDay: number, mealType: string) => void;
  onReplace?: (meal: MealWithRecipe, newRecipe: RecipeWithIngredients) => Promise<void>;
  onAddMeal?: (dayOfWeek: number, mealType: string) => void;
  onDeleteMeal?: (meal: MealWithRecipe) => Promise<void>;
};

function buildDays(plan: MealPlanWithMeals): DayMeals[] {
  const weekStart = new Date(plan.weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const dayOfWeek = i + 1;
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateLabel = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const dayMeals = plan.meals.filter((m) => m.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      dayName: DAY_NAMES[i],
      dateLabel,
      breakfast:        dayMeals.find((m) => m.mealType === 'breakfast') ?? null,
      second_breakfast: dayMeals.find((m) => m.mealType === 'second_breakfast') ?? null,
      lunch:            dayMeals.find((m) => m.mealType === 'lunch') ?? null,
      dinner:           dayMeals.find((m) => m.mealType === 'dinner') ?? null,
      cocktail:         dayMeals.find((m) => m.mealType === 'cocktail') ?? null,
      snacks:           dayMeals.filter((m) => MULTI_MEAL_TYPES.includes(m.mealType as (typeof MULTI_MEAL_TYPES)[number])),
    };
  });
}

export default function WeekGrid({
  plan,
  dragged,
  dragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onReplace,
  onAddMeal,
  onDeleteMeal,
}: Props) {
  const colorMaps = useMemo(() => {
    const grouped: Record<string, (string | null)[]> = {};
    for (const m of plan.meals) {
      (grouped[m.mealType] ??= []).push(m.batchGroupId);
    }
    return Object.fromEntries(
      CORE_MEAL_TYPES.map((t) => [t, buildBatchColorMap(grouped[t] ?? [])])
    ) as Record<(typeof CORE_MEAL_TYPES)[number], ReturnType<typeof buildBatchColorMap>>;
  }, [plan.meals]);

  const [selectedMeal, setSelectedMeal] = useState<{ meal: MealWithRecipe; color: BatchColor | null; batchDays: number } | null>(null);
  const days = buildDays(plan);

  function getBatchDays(meal: MealWithRecipe): number {
    if (!meal.batchGroupId) return 1;
    return plan.meals.filter((m) => m.batchGroupId === meal.batchGroupId).length;
  }

  function getMealColor(meal: MealWithRecipe): BatchColor | null {
    if (!meal.batchGroupId) return null;
    const map = colorMaps[meal.mealType as keyof typeof colorMaps] ?? colorMaps.breakfast;
    return map.get(meal.batchGroupId) ?? null;
  }

  function isDropTarget(dayOfWeek: number, mealType: string) {
    // Allow cross-type drops: any cell is a valid target except the exact source cell
    return dragged !== null && !(dragged.dayOfWeek === dayOfWeek && dragged.mealType === mealType);
  }

  function isOver(dayOfWeek: number, mealType: string) {
    return dragOver?.dayOfWeek === dayOfWeek && dragOver?.mealType === mealType;
  }

  function getDragProps(meal: MealWithRecipe) {
    const isBeingDragged =
      dragged?.dayOfWeek === meal.dayOfWeek && dragged?.mealType === meal.mealType;
    return {
      draggable: true,
      onDragStart: () => onDragStart(meal.dayOfWeek, meal.mealType),
      onDragEnd: onDragEnd,
      isDragging: isBeingDragged,
    };
  }

  function getDropProps(dayOfWeek: number, mealType: string) {
    const isTarget = isDropTarget(dayOfWeek, mealType);
    const isHovered = isOver(dayOfWeek, mealType);
    return {
      onDragOver: (e: React.DragEvent) => {
        if (isTarget) {
          e.preventDefault();
          onDragOver(dayOfWeek, mealType);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        onDrop(dayOfWeek, mealType);
      },
      isDropTarget: isTarget,
      isDropHover: isHovered,
    };
  }

  return (
    <>
      {/* ——— Desktop: row-per-meal-type so all 7 cells in a row share the same height ——— */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-x-4 gap-y-5 min-w-[900px]">

          {/* Row 0: Day headers */}
          {days.map((day) => (
            <div key={day.dayOfWeek} className="text-center py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{day.dayName}</p>
              <p className="text-sm text-gray-400">{day.dateLabel}</p>
            </div>
          ))}

          {/* Rows 1-3: one row per meal type — CSS grid auto-equalises row height */}
          {CORE_MEAL_TYPES.map((mealType) =>
            days.map((day) => {
              const meal = day[mealType];
              const dropProps = getDropProps(day.dayOfWeek, mealType);

              if (meal) {
                const dp = getDragProps(meal);
                const color = getMealColor(meal);
                return (
                  <div
                    key={`${mealType}-${day.dayOfWeek}`}
                    draggable={dp.draggable}
                    onDragStart={dp.onDragStart}
                    onDragEnd={dp.onDragEnd}
                    onDragOver={dropProps.onDragOver}
                    onDrop={dropProps.onDrop}
                    className={`transition-all ${dp.isDragging ? 'opacity-40 scale-95' : ''} ${dropProps.isDropHover ? 'ring-2 ring-teal-400 rounded-xl' : ''} ${dropProps.isDropTarget && !dp.isDragging ? 'cursor-copy' : 'cursor-grab active:cursor-grabbing'}`}
                  >
                    <MealCard
                      meal={meal}
                      color={color}
                      onClick={() => setSelectedMeal({ meal, color, batchDays: getBatchDays(meal) })}
                    />
                  </div>
                );
              }

              // Empty drop slot
              return (
                <div
                  key={`${mealType}-${day.dayOfWeek}`}
                  onDragOver={dropProps.onDragOver}
                  onDrop={dropProps.onDrop}
                  className={`relative flex items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                    dropProps.isDropHover
                      ? 'border-teal-400 bg-teal-50 shadow-sm'
                      : dropProps.isDropTarget
                      ? 'border-border bg-white'
                      : 'border-transparent'
                  }`}
                >
                  {onAddMeal && (
                    <button
                      type="button"
                      onClick={() => onAddMeal(day.dayOfWeek, mealType)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-transparent text-gray-400 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      title={`Dodaj ${MEAL_TYPE_LABELS[mealType] ?? mealType}`}
                      aria-label={`Dodaj ${MEAL_TYPE_LABELS[mealType] ?? mealType}`}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Row 4: Snacks + add button */}
          {days.map((day) => (
            <div key={`snack-${day.dayOfWeek}`} className="flex flex-col gap-1">
              {day.snacks.map((s) => (
                <MealCard
                  key={s.id}
                  meal={s}
                  color={null}
                  onClick={() => setSelectedMeal({ meal: s, color: null, batchDays: 1 })}
                />
              ))}
              {onAddMeal && (
                <button
                  onClick={() => onAddMeal(day.dayOfWeek, 'snack')}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-2xl border border-dashed border-border text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/70 transition-colors text-xs"
                  title="Dodaj przepis do tego dnia"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>
          ))}

          {/* Row 5: Daily macro summary */}
          {days.map((day) => (
            <DayMacroSummary key={`macro-${day.dayOfWeek}`} day={day} />
          ))}
        </div>
      </div>

      {/* ——— Mobile: vertical day list ——— */}
      <div className="lg:hidden space-y-5">
        {days.map((day, i) => (
          <section key={day.dayOfWeek}>
            <div className="flex items-baseline gap-2 px-4 mb-2">
              <h2 className="text-sm font-semibold text-gray-900">{DAY_NAMES_FULL[i]}</h2>
              <span className="text-xs text-gray-400">{day.dateLabel}</span>
            </div>

            <div className="px-4 space-y-5">
              {CORE_MEAL_TYPES.map((mealType) => {
                const meal = day[mealType];
                const dropProps = getDropProps(day.dayOfWeek, mealType);
                if (meal) {
                  const dp = getDragProps(meal);
                  const color = getMealColor(meal);
                  return (
                    <div
                      key={mealType}
                      draggable={dp.draggable}
                      onDragStart={dp.onDragStart}
                      onDragEnd={dp.onDragEnd}
                      onDragOver={dropProps.onDragOver}
                      onDrop={dropProps.onDrop}
                      className={`transition-all ${dp.isDragging ? 'opacity-40 scale-95' : ''} ${dropProps.isDropHover ? 'ring-2 ring-teal-400 rounded-xl' : ''}`}
                    >
                      <MealCard
                        meal={meal}
                        color={color}
                        onClick={() => setSelectedMeal({ meal, color, batchDays: getBatchDays(meal) })}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={mealType}
                    onDragOver={dropProps.onDragOver}
                    onDrop={dropProps.onDrop}
                    className={`relative flex h-12 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                      dropProps.isDropHover ? 'border-teal-400 bg-teal-50' : 'border-border'
                    }`}
                  >
                    {onAddMeal && (
                      <button
                        type="button"
                        onClick={() => onAddMeal(day.dayOfWeek, mealType)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-transparent text-gray-400 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                        title={`Dodaj ${MEAL_TYPE_LABELS[mealType] ?? mealType}`}
                        aria-label={`Dodaj ${MEAL_TYPE_LABELS[mealType] ?? mealType}`}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {day.snacks.map((s) => (
                <MealCard
                  key={s.id}
                  meal={s}
                  color={null}
                  onClick={() => setSelectedMeal({ meal: s, color: null, batchDays: 1 })}
                />
              ))}
              {onAddMeal && (
                <button
                  onClick={() => onAddMeal(day.dayOfWeek, 'snack')}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/50 transition-colors text-xs"
                >
                  <Plus size={12} />
                  Dodaj przepis
                </button>
              )}

              <DayMacroSummary day={day} />
            </div>
          </section>
        ))}
      </div>

      {/* DnD hint */}
      {dragged && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/70 text-white text-xs rounded-full pointer-events-none">
          Upuść na dowolny slot żeby zamienić
        </div>
      )}

      {/* Recipe modal */}
      {selectedMeal && (
        <RecipeModal
          meal={selectedMeal.meal}
          color={selectedMeal.color}
          batchDays={selectedMeal.batchDays}
          onClose={() => setSelectedMeal(null)}
          onReplace={
            onReplace
              ? (newRecipe: RecipeWithIngredients) => onReplace(selectedMeal.meal, newRecipe)
              : undefined
          }
          onDelete={
            onDeleteMeal && MULTI_MEAL_TYPES.includes(selectedMeal.meal.mealType as (typeof MULTI_MEAL_TYPES)[number])
              ? async () => {
                  await onDeleteMeal(selectedMeal.meal);
                  setSelectedMeal(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}

// ── Daily macro summary ────────────────────────────────────────────────────

function DayMacroSummary({ day }: { day: DayMeals }) {
  const meals = [
    day.breakfast,
    day.second_breakfast,
    day.lunch,
    day.dinner,
    day.cocktail,
    ...day.snacks,
  ].filter((m): m is MealWithRecipe => m !== null);

  const totals = meals.reduce(
    (acc, m) => {
      acc.kcal += (m.recipe.kcalPerServing ?? 0) * m.servings;
      acc.protein += (m.recipe.proteinG ?? 0) * m.servings;
      acc.carbs += (m.recipe.carbsG ?? 0) * m.servings;
      acc.fat += (m.recipe.fatG ?? 0) * m.servings;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const kcal = Math.round(totals.kcal);
  const protein = Math.round(totals.protein);
  const carbs = Math.round(totals.carbs);
  const fat = Math.round(totals.fat);

  if (!kcal) return <div className="h-14" />;

  return (
    <div className="rounded-[1.1rem] border border-border bg-white/70 px-3 py-2.5 space-y-1 shadow-sm">
      <p className="text-sm font-bold text-gray-700 text-center tabular-nums">
        {kcal.toLocaleString('pl-PL')} kcal
      </p>
      <div className="flex justify-between text-xs text-gray-400 tabular-nums">
        <span title="Białko">B {protein}g</span>
        <span title="Węglowodany">W {carbs}g</span>
        <span title="Tłuszcze">T {fat}g</span>
      </div>
    </div>
  );
}
