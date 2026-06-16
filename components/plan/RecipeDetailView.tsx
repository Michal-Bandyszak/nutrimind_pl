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
  const replacedIngredients = (recipe.componentLinks ?? []).map((link) => ({
    ...link,
    replaced: safeJsonParse<string[]>(link.replacedIngredients, []),
  }));

  return (
    <>
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-gray-50/80 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-2.5 py-1 text-[11px] font-medium text-gray-500 sm:px-3 sm:text-xs">
                {MEAL_TYPE_EMOJI[meal.mealType] ?? '🍽'} {MEAL_TYPE_LABELS[meal.mealType] ?? meal.mealType}
              </span>
              {recipe.variantKey !== 'base' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 sm:px-3 sm:text-xs">
                  {recipe.variantKey}
                </span>
              )}
              {color && batchDays > 1 && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${color.bg} ${color.border} ${color.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                  Partia na {batchDays} dni
                </span>
              )}
            </div>
            <h2 className="max-w-[18ch] text-[1.08rem] font-semibold leading-[1.2] text-gray-900 sm:max-w-none sm:text-[1.35rem] sm:leading-snug">
              {recipe.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Macros */}
        {(kcal || recipe.proteinG) && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:grid-cols-5">
            {kcal && <MacroPill label="kcal" value={String(kcal)} />}
            {recipe.proteinG && <MacroPill label="B" value={`${Math.round(recipe.proteinG * displayServings)}g`} />}
            {recipe.carbsG && <MacroPill label="W" value={`${Math.round(recipe.carbsG * displayServings)}g`} />}
            {recipe.fatG && <MacroPill label="T" value={`${Math.round(recipe.fatG * displayServings)}g`} />}
            {recipe.fiberG && <MacroPill label="Bł" value={`${Math.round(recipe.fiberG * displayServings)}g`} />}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <div className="space-y-4 sm:space-y-5">
          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <section className="rounded-[1.25rem] border border-border bg-white/55 p-3 sm:p-4">
              <h3 className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <span>
                  Składniki · {displayServings} {displayServings === 1 ? 'porcja' : displayServings < 5 ? 'porcje' : 'porcji'}
                </span>
                {batchDays > 1 && (
                  <button
                    onClick={() => setShowTotal((v) => !v)}
                    className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium normal-case text-teal-700 transition hover:bg-teal-100"
                  >
                    {showTotal ? `na ${batchDays} dni` : 'na 1 dzień'}
                  </button>
                )}
              </h3>
              <ul className="divide-y divide-border">
                {recipe.ingredients.map((ri) => (
                  <li key={ri.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <span className="pr-2 leading-snug text-gray-800">{ri.ingredient.name}</span>
                    <span className="shrink-0 text-right tabular-nums text-gray-500">
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

          {recipe.adjustmentNote && (
            <section className="rounded-[1.25rem] border border-violet-100 bg-violet-50/80 p-3 sm:p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">
                Notatka wariantu
              </h3>
              <p className="text-sm leading-relaxed text-violet-900/80">{recipe.adjustmentNote}</p>
            </section>
          )}

          {replacedIngredients.length > 0 && (
            <section className="rounded-[1.25rem] border border-amber-100 bg-amber-50/70 p-3 sm:p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-600">
                Baza do przygotowania
              </h3>
              <div className="space-y-3">
                {replacedIngredients.map((link) => (
                  <div key={link.id} className="rounded-xl border border-amber-100 bg-white/70 px-3 py-2.5">
                    <p className="text-sm font-medium text-gray-900">{link.componentRecipe.name}</p>
                    {link.displayText && (
                      <p className="mt-0.5 text-xs text-gray-500">{link.displayText}</p>
                    )}
                    {link.note && (
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">{link.note}</p>
                    )}
                    {link.replaced.length > 0 && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Zastępuje: {link.replaced.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <section className="rounded-[1.25rem] border border-border bg-white/55 p-3 sm:p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Przygotowanie</h3>
              <ol className="space-y-3">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
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

      {/* Footer with delete / replace buttons */}
      {(onOpenReplace || onDelete) && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gray-50/80 px-4 py-3 sm:px-6">
          {onDelete && (
            <button
              onClick={async () => {
                setDeleting(true);
                try { await onDelete(); }
                finally { setDeleting(false); }
              }}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Usuń z planu
            </button>
          )}
          {onOpenReplace && (
            <button
              onClick={onOpenReplace}
              className="btn-primary ml-auto flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition"
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
    <div className="rounded-xl border border-border bg-white/70 px-2.5 py-2 sm:px-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 text-[0.95rem] font-semibold text-gray-900 sm:mt-1 sm:text-sm">{value}</p>
    </div>
  );
}
