import { useState } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import type { MealWithRecipe } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';
import { MEAL_TYPE_LABELS } from '@/lib/utils/recipeConstants';
import { formatIngredientAmount, safeJsonParse } from '@/lib/utils/formatUnits';

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  batchDays: number;
  onClose: () => void;
  onOpenReplace?: () => void;
  onDelete?: () => Promise<void>;
};

export default function RecipeDetailView({
  meal, color, batchDays, onClose, onOpenReplace, onDelete,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const { recipe } = meal;
  const totalServings = meal.servings * batchDays;
  const displayServings = showTotal ? totalServings : meal.servings;
  const kcal = recipe.kcalPerServing ? Math.round(recipe.kcalPerServing * displayServings) : null;
  const isPerWhole = recipe.ingredientBasis === 'per-whole';
  const baseServings = recipe.baseServings || 1;

  const instructions = safeJsonParse<string[]>(recipe.instructions, []);

  return (
    <>
      {/* Header */}
      <div className="bg-gray-50/80 px-6 py-5 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-gray-500">
                {MEAL_TYPE_EMOJI[meal.mealType] ?? '🍽'} {MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}
              </span>
              {color && batchDays > 1 && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${color.bg} ${color.border} ${color.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                  Partia na {batchDays} dni
                </span>
              )}
            </div>
            <h2 className="text-[1.35rem] font-semibold leading-snug text-gray-900">
              {recipe.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Macros */}
        {(kcal || recipe.proteinG) && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {kcal && <MacroPill label="kcal" value={String(kcal)} />}
            {recipe.proteinG && <MacroPill label="B" value={`${Math.round(recipe.proteinG * displayServings)}g`} />}
            {recipe.carbsG && <MacroPill label="W" value={`${Math.round(recipe.carbsG * displayServings)}g`} />}
            {recipe.fatG && <MacroPill label="T" value={`${Math.round(recipe.fatG * displayServings)}g`} />}
            {recipe.fiberG && <MacroPill label="Bł" value={`${Math.round(recipe.fiberG * displayServings)}g`} />}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>
                Składniki · {displayServings} {displayServings === 1 ? 'porcja' : displayServings < 5 ? 'porcje' : 'porcji'}
              </span>
              {batchDays > 1 && (
                <button
                  onClick={() => setShowTotal((v) => !v)}
                  className="normal-case font-normal text-teal-600 hover:underline text-xs"
                >
                  {showTotal ? `na ${batchDays} dni` : 'na 1 dzień'}
                </button>
              )}
            </h3>
            <ul className="divide-y divide-border">
              {recipe.ingredients.map((ri) => (
                <li key={ri.id} className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
                  <span className="text-gray-800">{ri.ingredient.name}</span>
                  <span className="text-gray-400 shrink-0 tabular-nums">
                    {formatIngredientAmount(
                      (isPerWhole ? ri.amountG / baseServings : ri.amountG) * displayServings,
                      ri.ingredient.pieceWeightG,
                      ri.ingredient.hintUnitG,
                      ri.ingredient.hintUnit,
                    )}
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

      {/* Footer with delete / replace buttons */}
      {(onOpenReplace || onDelete) && (
        <div className="bg-gray-50/80 px-6 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {onDelete && (
            <button
              onClick={async () => {
                setDeleting(true);
                try { await onDelete(); }
                finally { setDeleting(false); }
              }}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Usuń z planu
            </button>
          )}
          {onOpenReplace && (
            <button
              onClick={onOpenReplace}
              className="btn-primary ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-2xl transition"
            >
              Zamień przepis
            </button>
          )}
        </div>
      )}
    </>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
