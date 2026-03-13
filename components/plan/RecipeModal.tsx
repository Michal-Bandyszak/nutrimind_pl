'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Search, Check, Loader2, Trash2 } from 'lucide-react';
import type { MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  breakfast:        'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch:            'Obiad',
  dinner:           'Kolacja',
  snack:            'Przekąska',
  cocktail:         'Koktajl',
  dessert:          'Ciasto / deser',
};

const TYPE_FILTERS = [
  { value: 'all',              label: 'Wszystkie' },
  { value: 'breakfast',        label: 'Śniadania' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiady' },
  { value: 'dinner',           label: 'Kolacje' },
  { value: 'snack',            label: 'Przekąski' },
  { value: 'cocktail',         label: 'Koktajle' },
  { value: 'dessert',          label: 'Ciasta i desery' },
];

const TYPE_COLORS: Record<string, string> = {
  breakfast:        'bg-amber-100 text-amber-700',
  second_breakfast: 'bg-orange-100 text-orange-700',
  lunch:            'bg-teal-100 text-teal-700',
  dinner:           'bg-blue-100 text-blue-700',
  snack:            'bg-rose-100 text-rose-700',
  cocktail:         'bg-violet-100 text-violet-700',
  dessert:          'bg-pink-100 text-pink-700',
};

const TYPE_LABELS_SHORT: Record<string, string> = {
  breakfast:        'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch:            'Obiad',
  dinner:           'Kolacja',
  snack:            'Przekąska',
  cocktail:         'Koktajl',
  dessert:          'Ciasto / deser',
};

function formatPieces(pieces: number): string {
  const rounded = Math.round(pieces * 4) / 4; // round to nearest 0.25
  if (rounded <= 0) return '—';
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  if (whole === 0) return `${fracStr} szt.`;
  if (fracStr) return `${whole}${fracStr} szt.`;
  return `${whole} szt.`;
}

function formatIngredientAmount(grams: number, pieceWeightG?: number | null): string {
  if (pieceWeightG && pieceWeightG > 0) {
    return formatPieces(grams / pieceWeightG);
  }
  if (grams >= 1000) return `${(grams / 1000).toFixed(1).replace('.0', '')} kg`;
  return `${Math.round(grams)} g`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  onClose: () => void;
  onReplace?: (newRecipe: RecipeWithIngredients) => Promise<void>;
  onDelete?: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function RecipeModal({ meal, color, onClose, onReplace, onDelete }: Props) {
  const [view, setView] = useState<'detail' | 'replace'>('detail');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (view === 'replace') setView('detail');
        else onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, view]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'detail' ? (
          <DetailView
            meal={meal}
            color={color}
            onClose={onClose}
            onOpenReplace={onReplace ? () => setView('replace') : undefined}
            onDelete={onDelete}
          />
        ) : (
          <ReplaceView
            meal={meal}
            onBack={() => setView('detail')}
            onClose={onClose}
            onReplace={onReplace!}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail view (existing recipe info)
// ─────────────────────────────────────────────────────────────────────────────

function DetailView({
  meal,
  color,
  onClose,
  onOpenReplace,
  onDelete,
}: {
  meal: MealWithRecipe;
  color: BatchColor | null;
  onClose: () => void;
  onOpenReplace?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const { recipe } = meal;
  const kcal = recipe.kcalPerServing ? Math.round(recipe.kcalPerServing * meal.servings) : null;

  const instructions: string[] = (() => {
    try { return JSON.parse(recipe.instructions) as string[]; }
    catch { return []; }
  })();

  return (
    <>
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
      <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
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
                    {ri.amountG
                      ? formatIngredientAmount(ri.amountG * meal.servings, ri.ingredient.pieceWeightG)
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

      {/* Footer with delete / replace buttons */}
      {(onOpenReplace || onDelete) && (
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
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
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-xl transition ml-auto"
            >
              Zamień przepis
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Replace view (recipe picker)
// ─────────────────────────────────────────────────────────────────────────────

function ReplaceView({
  meal,
  onBack,
  onClose,
  onReplace,
}: {
  meal: MealWithRecipe;
  onBack: () => void;
  onClose: () => void;
  onReplace: (newRecipe: RecipeWithIngredients) => Promise<void>;
}) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // recipeId being saved
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(meal.mealType);

  // Fetch all recipes once
  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((json) => setAllRecipes((json.data as RecipeWithIngredients[]) ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allRecipes.filter((r) => {
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      const notCurrent = r.id !== meal.recipe.id;
      return matchesType && matchesQuery && notCurrent;
    });
  }, [allRecipes, query, typeFilter, meal.recipe.id]);

  async function handleSelect(recipe: RecipeWithIngredients) {
    setSaving(recipe.id);
    try {
      await onReplace(recipe);
      onClose();
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Wróć"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">
            {MEAL_TYPE_EMOJI[meal.mealType]} {MEAL_LABELS[meal.mealType]} — zamień
          </p>
          <p className="text-sm font-medium text-gray-600 truncate">{meal.recipe.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Szukaj przepisu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === value
                  ? 'bg-teal-700 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe list */}
      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">Brak pasujących przepisów.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((recipe) => (
              <li key={recipe.id}>
                <button
                  onClick={() => handleSelect(recipe)}
                  disabled={saving !== null}
                  className="w-full text-left px-3 py-3 rounded-xl border border-border hover:border-teal-300 hover:bg-teal-50/50 transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[recipe.type] ?? 'bg-gray-100 text-gray-500'}`}>
                          {TYPE_LABELS_SHORT[recipe.type] ?? recipe.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 leading-snug">{recipe.name}</p>
                      {recipe.kcalPerServing && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Math.round(recipe.kcalPerServing)} kcal
                          {recipe.proteinG && ` · B ${Math.round(recipe.proteinG)}g`}
                          {recipe.carbsG && ` · W ${Math.round(recipe.carbsG)}g`}
                          {recipe.fatG && ` · T ${Math.round(recipe.fatG)}g`}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 mt-1">
                      {saving === recipe.id ? (
                        <Loader2 size={16} className="animate-spin text-teal-600" />
                      ) : (
                        <Check size={16} className="text-gray-300 group-hover:text-teal-500 transition-colors" />
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
