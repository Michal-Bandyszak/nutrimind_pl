'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { MealWithRecipe } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
  cocktail: 'Koktajl',
};

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  onClose: () => void;
};

export default function RecipeModal({ meal, color, onClose }: Props) {
  const { recipe } = meal;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const kcal = recipe.kcalPerServing ? Math.round(recipe.kcalPerServing * meal.servings) : null;

  const instructions: string[] = (() => {
    try { return JSON.parse(recipe.instructions) as string[]; }
    catch { return []; }
  })();

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b border-border shrink-0 ${color ? color.bg : 'bg-gray-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">
                {MEAL_TYPE_EMOJI[meal.mealType] ?? '🍽'} {MEAL_LABELS[meal.mealType] ?? meal.mealType}
              </p>
              <h2 className={`text-lg font-semibold leading-snug ${color ? color.text : 'text-gray-900'}`}>
                {recipe.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Macros */}
          {(kcal || recipe.proteinG) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-600">
              {kcal && (
                <span><span className="font-semibold text-gray-800">{kcal}</span> kcal</span>
              )}
              {recipe.proteinG && (
                <span>B <span className="font-semibold text-gray-800">{Math.round(recipe.proteinG * meal.servings)}g</span></span>
              )}
              {recipe.carbsG && (
                <span>W <span className="font-semibold text-gray-800">{Math.round(recipe.carbsG * meal.servings)}g</span></span>
              )}
              {recipe.fatG && (
                <span>T <span className="font-semibold text-gray-800">{Math.round(recipe.fatG * meal.servings)}g</span></span>
              )}
              {recipe.fiberG && (
                <span>Błonnik <span className="font-semibold text-gray-800">{Math.round(recipe.fiberG * meal.servings)}g</span></span>
              )}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Składniki · {meal.servings} {meal.servings === 1 ? 'porcja' : meal.servings < 5 ? 'porcje' : 'porcji'}
              </h3>
              <ul className="divide-y divide-border">
                {recipe.ingredients.map((ri) => (
                  <li key={ri.id} className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
                    <span className="text-gray-800">{ri.ingredient.name}</span>
                    <span className="text-gray-400 shrink-0 tabular-nums">
                      {ri.displayText
                        ? ri.displayText
                        : ri.amountG
                        ? `${Math.round(ri.amountG * meal.servings)} g`
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Przygotowanie</h3>
              <ol className="space-y-3">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
