'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Loader2, ChevronDown, Minus, Plus } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import { DAY_NAMES_FULL } from '@/lib/utils/batchColors';
import { MEAL_TYPE_LABELS } from '@/lib/utils/recipeConstants';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RECIPE_TYPE_FILTERS = [
  { value: 'all',              label: 'Wszystkie' },
  { value: 'dessert',          label: 'Ciasta i desery' },
  { value: 'snack',            label: 'Przekąski' },
  { value: 'breakfast',        label: 'Śniadania' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiady' },
  { value: 'dinner',           label: 'Kolacje' },
  { value: 'cocktail',         label: 'Koktajle' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast',        label: 'Śniadanie' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiad' },
  { value: 'dinner',           label: 'Kolacja' },
  { value: 'cocktail',         label: 'Koktajl' },
  { value: 'snack',            label: 'Przekąska' },
  { value: 'dessert',          label: 'Ciasto / deser' },
  { value: 'extra',            label: 'Dodatkowy' },
];

const TYPE_COLORS: Record<string, string> = {
  breakfast:        'bg-amber-100 text-amber-700',
  second_breakfast: 'bg-orange-100 text-orange-700',
  lunch:            'bg-teal-100 text-teal-700',
  dinner:           'bg-blue-100 text-blue-700',
  snack:            'bg-rose-100 text-rose-700',
  cocktail:         'bg-violet-100 text-violet-700',
  dessert:          'bg-pink-100 text-pink-700',
  extra:            'bg-gray-100 text-gray-700',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  dayOfWeek: number; // 1 = Mon … 7 = Sun
  mealType: string;
  onClose: () => void;
  onAdd: (recipe: RecipeWithIngredients, mealType: string, servings: number) => Promise<void>;
};

function mealTypeToRecipeFilter(mealType: string) {
  return mealType === 'extra' ? 'all' : mealType;
}

export default function AddMealModal({ dayOfWeek, mealType: initialMealType, onClose, onAdd }: Props) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState(initialMealType);
  const [typeFilter, setTypeFilter] = useState(mealTypeToRecipeFilter(initialMealType));
  const [servings, setServings] = useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      return matchesType && matchesQuery;
    });
  }, [allRecipes, query, typeFilter]);

  async function handleSelect(recipe: RecipeWithIngredients) {
    setSaving(recipe.id);
    setError(null);
    try {
      await onAdd(recipe, mealType, servings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać posiłku.');
    } finally {
      setSaving(null);
    }
  }

  function handleMealTypeChange(nextMealType: string) {
    setMealType(nextMealType);
    setTypeFilter(mealTypeToRecipeFilter(nextMealType));
  }

  const dayLabel = DAY_NAMES_FULL[dayOfWeek - 1] ?? `Dzień ${dayOfWeek}`;

  return createPortal(
    <div
      className="modal-scrim fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="modal-panel relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Dodaj do planu</p>
            <p className="text-sm font-semibold text-gray-900">{dayLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search + type filters */}
        <div className="px-4 pt-3 pb-2 shrink-0 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Dodaj jako
              </span>
              <div className="relative">
                <select
                  value={mealType}
                  onChange={(e) => handleMealTypeChange(e.target.value)}
                  className="input-base w-full appearance-none rounded-xl py-2 pl-3 pr-9 text-sm"
                >
                  {MEAL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </label>

            <label className="w-28">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Porcje
              </span>
              <div className="flex items-center rounded-xl border border-border bg-white px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setServings((value) => Math.max(1, value - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Zmniejsz liczbę porcji"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={servings}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setServings(Number.isFinite(next) && next > 0 ? Math.round(next) : 1);
                  }}
                  className="w-full border-0 bg-transparent px-0 text-center text-sm font-semibold text-gray-900 focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setServings((value) => value + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Zwiększ liczbę porcji"
                >
                  <Plus size={14} />
                </button>
              </div>
            </label>
          </div>

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

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {RECIPE_TYPE_FILTERS.map(({ value, label }) => (
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
          {error && (
            <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
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
      </div>
    </div>,
    document.body,
  );
}
