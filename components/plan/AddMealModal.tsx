'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Loader2 } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import { DAY_NAMES_FULL } from '@/lib/utils/batchColors';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: 'all',              label: 'Wszystkie' },
  { value: 'dessert',          label: 'Ciasta i desery' },
  { value: 'snack',            label: 'Przekąski' },
  { value: 'breakfast',        label: 'Śniadania' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiady' },
  { value: 'dinner',           label: 'Kolacje' },
  { value: 'cocktail',         label: 'Koktajle' },
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  dayOfWeek: number; // 1 = Mon … 7 = Sun
  onClose: () => void;
  onAdd: (recipe: RecipeWithIngredients) => Promise<void>;
};

export default function AddMealModal({ dayOfWeek, onClose, onAdd }: Props) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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
    try {
      await onAdd(recipe);
      onClose();
    } finally {
      setSaving(null);
    }
  }

  const dayLabel = DAY_NAMES_FULL[dayOfWeek - 1] ?? `Dzień ${dayOfWeek}`;

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
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Dodaj do planu</p>
            <p className="text-sm font-semibold text-gray-900">{dayLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search + type filters */}
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
      </div>
    </div>,
    document.body,
  );
}
