'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import type { RecipeListItem, RecipeWithIngredients } from '@/lib/types';
import {
  TYPE_FILTERS,
  RECIPE_KIND_FILTERS,
  getRecipeBrowserRole,
  getRecipeBrowserVariantLabel,
  getRecipeBrowserNote,
  isRecipe2500Variant,
  type RecipeBrowserKindFilter,
  type RecipeBrowserMeta,
} from '@/lib/utils/recipeConstants';
import { safeJsonParse } from '@/lib/utils/formatUnits';
import AddRecipeModal from '@/components/recipes/AddRecipeModal';
import RecipeCard from '@/components/recipes/RecipeCard';

type Props = { initialRecipeCount: number };

const FAVORITES_KEY = 'nutrimind-favorites';

function toRecipeListItem(recipe: RecipeWithIngredients): RecipeListItem {
  return {
    id: recipe.id,
    name: recipe.name,
    type: recipe.type,
    role: recipe.role,
    source: recipe.source,
    variantKey: recipe.variantKey,
    adjustmentNote: recipe.adjustmentNote,
    tags: recipe.tags,
    ingredientBasis: recipe.ingredientBasis,
    baseServings: recipe.baseServings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    kcalPerServing: recipe.kcalPerServing,
    proteinG: recipe.proteinG,
    carbsG: recipe.carbsG,
    fatG: recipe.fatG,
    _count: recipe._count ?? { mealPlanMeals: 0 },
  };
}

export default function RecipesClient({ initialRecipeCount }: Props) {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState<RecipeBrowserKindFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) setFavorites(new Set(JSON.parse(saved) as string[]));
    } catch { /* ignore */ }
  }, []);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/recipes?view=list', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Nie udało się załadować przepisów.');
      }
      setRecipes((json.data as RecipeListItem[]) ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Nie udało się załadować przepisów.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const recipeMeta = r as RecipeListItem & RecipeBrowserMeta;
      const tags = safeJsonParse<string[]>(r.tags, []);
      const role = getRecipeBrowserRole(recipeMeta);
      const isVariant2500 = isRecipe2500Variant(recipeMeta);
      const searchText = [
        r.name,
        r.type,
        role,
        recipeMeta.variantKey,
        getRecipeBrowserVariantLabel(recipeMeta),
        getRecipeBrowserNote(recipeMeta),
        tags.join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesType =
        typeFilter === 'all' ? true :
        typeFilter === 'favorites' ? favorites.has(r.id) :
        typeFilter === 'soup' ? tags.includes('zupa') || r.name.toLowerCase().includes('zupa') :
        typeFilter === 'cocktail' ? tags.includes('cocktail') :
        r.type === typeFilter;
      const matchesKind =
        kindFilter === 'all' ? true :
        isVariant2500;
      const matchesQuery = !q || searchText.includes(q);
      return matchesType && matchesKind && matchesQuery;
    });
  }, [recipes, query, typeFilter, kindFilter, favorites]);

  return (
    <>
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Szukaj przepisu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-base w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm placeholder:text-gray-400"
        />
      </div>

      {/* Type filters + Add button */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                typeFilter === value
                  ? 'bg-teal-800 text-white shadow-sm ring-1 ring-teal-600/20'
                  : 'btn-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition"
        >
          <Plus size={13} /> Dodaj przepis
        </button>
      </div>

      {RECIPE_KIND_FILTERS.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1">
            {RECIPE_KIND_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setKindFilter(value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  kindFilter === value
                    ? 'bg-teal-800 text-white shadow-sm ring-1 ring-teal-600/20'
                    : 'btn-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {loading ? `${initialRecipeCount} przepisów · ładowanie…` : `${filtered.length} przepisów`}
      </p>

      {/* Recipe list */}
      <div className="space-y-4">
        {loading && recipes.length === 0 && (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
              >
                <div className="h-4 w-28 rounded-full bg-gray-200" />
                <div className="mt-3 h-5 w-2/3 rounded-full bg-gray-200" />
                <div className="mt-4 flex gap-2">
                  <div className="h-4 w-16 rounded-full bg-gray-100" />
                  <div className="h-4 w-16 rounded-full bg-gray-100" />
                  <div className="h-4 w-16 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && loadError && recipes.length === 0 && (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadRecipes()}
              className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            expanded={expanded === recipe.id}
            onToggle={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
            isFavorite={favorites.has(recipe.id)}
            onToggleFavorite={() => toggleFavorite(recipe.id)}
          />
        ))}
      </div>

      {!loading && !loadError && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Brak przepisów spełniających kryteria.
        </div>
      )}
    </div>

    {modalOpen && (
      <AddRecipeModal
        onClose={() => setModalOpen(false)}
        onSaved={(r) => {
          setRecipes((prev) => [toRecipeListItem(r), ...prev]);
          setModalOpen(false);
        }}
      />
    )}
    </>
  );
}
