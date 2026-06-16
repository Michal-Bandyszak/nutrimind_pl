'use client';

import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Search, Check, Loader2, X } from 'lucide-react';
import type { MealWithRecipe, RecipeWithIngredients } from '@/lib/types';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';
import { MEAL_TYPE_LABELS, TYPE_COLORS, TYPE_FILTERS_BASIC } from '@/lib/utils/recipeConstants';

type Props = {
  meal: MealWithRecipe;
  onBack: () => void;
  onClose: () => void;
  onReplace: (newRecipe: RecipeWithIngredients) => Promise<void>;
};

export default function RecipeReplaceView({ meal, onBack, onClose, onReplace }: Props) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(meal.mealType);

  useEffect(() => {
    fetch('/api/recipes')
      .then((r) => r.json())
      .then((json) => setAllRecipes((json.data as RecipeWithIngredients[]) ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allRecipes.filter((r) => {
      if (r.role === 'component') return false;
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      const notCurrent = r.id !== meal.recipe.id;
      return matchesType && matchesQuery && notCurrent;
    });
  }, [allRecipes, query, typeFilter, meal.recipe.id]);

  const [replaceError, setReplaceError] = useState<string | null>(null);

  async function handleSelect(recipe: RecipeWithIngredients) {
    setSaving(recipe.id);
    if (replaceError) setReplaceError(null);
    try {
      await onReplace(recipe);
      onClose();
    } catch (err) {
      setReplaceError(err instanceof Error ? err.message : 'Nie udało się zamienić przepisu. Spróbuj ponownie.');
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
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Wróć"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">
            {MEAL_TYPE_EMOJI[meal.mealType]} {MEAL_TYPE_LABELS[meal.mealType]} — zamień
          </p>
          <p className="text-sm font-medium text-gray-600 truncate">{meal.recipe.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
            className="input-base w-full pl-8 pr-3 py-2 rounded-xl text-sm placeholder:text-gray-400"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TYPE_FILTERS_BASIC.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                typeFilter === value
                  ? 'bg-teal-800 text-white'
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
        {replaceError && (
          <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-2">{replaceError}</p>
        )}
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
                  className="w-full text-left px-3 py-3 rounded-2xl border border-border bg-white/60 hover:border-teal-300 hover:bg-teal-50/70 transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[recipe.type] ?? 'bg-gray-100 text-gray-500'}`}>
                          {MEAL_TYPE_LABELS[recipe.type] ?? recipe.type}
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
