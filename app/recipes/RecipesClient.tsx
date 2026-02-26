'use client';

import { useState, useMemo } from 'react';
import { Search, Clock, ChevronDown, ChevronUp, Users, Minus, Plus, ArrowRightLeft, Loader2, X } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import type { SubstitutionResult } from '@/lib/services/SubstitutionEngine';
import AddRecipeModal from '@/components/recipes/AddRecipeModal';

const TYPE_FILTERS = [
  { value: 'all',              label: 'Wszystkie' },
  { value: 'breakfast',        label: 'Śniadania' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiady' },
  { value: 'dinner',           label: 'Kolacje' },
  { value: 'snack',            label: 'Przekąski' },
  { value: 'cocktail',         label: 'Koktajle' },
  { value: 'soup',             label: 'Zupy' },
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

const TYPE_LABELS: Record<string, string> = {
  breakfast:        'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch:            'Obiad',
  dinner:           'Kolacja',
  snack:            'Przekąska',
  cocktail:         'Koktajl',
  dessert:          'Ciasto / deser',
};

type Props = { recipes: RecipeWithIngredients[] };

export default function RecipesClient({ recipes: initialRecipes }: Props) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return recipes.filter((r) => {
      let tags: string[] = [];
      try { tags = JSON.parse(r.tags) as string[]; } catch { /* ignore */ }
      const matchesType =
        typeFilter === 'all' ? true :
        typeFilter === 'soup' ? tags.includes('zupa') || r.name.toLowerCase().includes('zupa') :
        r.type === typeFilter;
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [recipes, query, typeFilter]);

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
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
        />
      </div>

      {/* Type filters + Add button */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === value
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white border border-border text-gray-500 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-full transition shadow-sm"
        >
          <Plus size={13} /> Dodaj przepis
        </button>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} przepisów</p>

      {/* Recipe list */}
      <div className="space-y-4">
        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            expanded={expanded === recipe.id}
            onToggle={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Brak przepisów spełniających kryteria.
        </div>
      )}
    </div>

    {modalOpen && (
      <AddRecipeModal
        onClose={() => setModalOpen(false)}
        onSaved={(r) => {
          setRecipes((prev) => [r, ...prev]);
          setModalOpen(false);
        }}
      />
    )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function formatAmount(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1).replace('.0', '')} kg`;
  if (grams < 1) return `${Math.round(grams * 10) / 10} g`;
  return `${Math.round(grams)} g`;
}

function scaleAmount(amountG: number, servings: number, scalesLinearly: boolean): number {
  if (scalesLinearly) return amountG * servings;
  return amountG * Math.sqrt(servings);
}

function RecipeCard({
  recipe,
  expanded,
  onToggle,
}: {
  recipe: RecipeWithIngredients;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [servings, setServings] = useState(2);
  const [subsFor, setSubsFor] = useState<string | null>(null); // ingredientId being looked up
  const [subsData, setSubsData] = useState<SubstitutionResult | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);

  async function handleIngredientClick(ingredientId: string) {
    if (subsFor === ingredientId) {
      setSubsFor(null);
      setSubsData(null);
      return;
    }
    setSubsFor(ingredientId);
    setSubsData(null);
    setSubsLoading(true);
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}/substitutions`);
      const json = await res.json();
      if (res.ok) setSubsData(json.data as SubstitutionResult);
    } finally {
      setSubsLoading(false);
    }
  }

  const instructions: string[] = (() => {
    try { return JSON.parse(recipe.instructions) as string[]; }
    catch { return []; }
  })();

  const recipeTags: string[] = (() => {
    try { return JSON.parse(recipe.tags) as string[]; }
    catch { return []; }
  })();

  const macroScale = servings; // macros per serving × servings

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {/* ── Summary row (always visible, clickable) ── */}
      <button
        className="w-full text-left px-4 py-4 hover:bg-gray-50/50 transition-colors"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[recipe.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {TYPE_LABELS[recipe.type] ?? recipe.type}
              </span>
              {recipeTags.includes('zupa') && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                  Zupa
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{recipe.name}</h3>

            {/* Macro summary (1 serving) */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              {recipe.kcalPerServing && (
                <span className="font-medium text-gray-600">{Math.round(recipe.kcalPerServing)} kcal</span>
              )}
              {recipe.proteinG && <span>B {Math.round(recipe.proteinG)}g</span>}
              {recipe.carbsG && <span>W {Math.round(recipe.carbsG)}g</span>}
              {recipe.fatG && <span>T {Math.round(recipe.fatG)}g</span>}
              {recipe.kcalPerServing && <span className="text-gray-300">/ 1 porcja</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {(recipe.prepTimeMin || recipe.cookTimeMin) && (
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <Clock size={12} />
                {(recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0)} min
              </span>
            )}
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-border">
          {/* Servings scaler */}
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={15} className="text-teal-600" />
              <span className="font-medium">Porcje</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setServings(Math.max(1, servings - 1)); }}
                className="w-7 h-7 rounded-full border border-border bg-white flex items-center justify-center text-gray-500 hover:border-teal-400 hover:text-teal-700 transition active:scale-95"
                aria-label="Mniej porcji"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900">{servings}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setServings(Math.min(8, servings + 1)); }}
                className="w-7 h-7 rounded-full border border-border bg-white flex items-center justify-center text-gray-500 hover:border-teal-400 hover:text-teal-700 transition active:scale-95"
                aria-label="Więcej porcji"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Scaled macros */}
          {recipe.kcalPerServing && (
            <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100">
              <p className="text-xs text-teal-600 font-medium mb-1">
                Łącznie na {servings} {servings === 1 ? 'porcję' : servings < 5 ? 'porcje' : 'porcji'}
              </p>
              <div className="flex items-center gap-4 text-xs text-teal-700">
                <span className="font-semibold">{Math.round(recipe.kcalPerServing * macroScale)} kcal</span>
                {recipe.proteinG && <span>B {Math.round(recipe.proteinG * macroScale)}g</span>}
                {recipe.carbsG && <span>W {Math.round(recipe.carbsG * macroScale)}g</span>}
                {recipe.fatG && <span>T {Math.round(recipe.fatG * macroScale)}g</span>}
                {recipe.fiberG && <span>Bł {Math.round(recipe.fiberG * macroScale)}g</span>}
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Składniki
              </p>
              <p className="text-xs text-gray-300">kliknij składnik → zamienniki</p>
            </div>
            <ul className="space-y-1">
              {recipe.ingredients.map((ri) => {
                const scaled = scaleAmount(ri.amountG, servings, ri.scalesLinearly);
                const isActive = subsFor === ri.ingredient.id;
                return (
                  <li key={ri.id}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleIngredientClick(ri.ingredient.id); }}
                      className={`w-full flex items-baseline justify-between gap-2 text-sm px-2 py-1.5 rounded-lg transition-colors text-left ${
                        isActive ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-700 flex items-center gap-1.5">
                        {ri.ingredient.name}
                        {isActive && <ArrowRightLeft size={12} className="text-teal-500" />}
                      </span>
                      <span className="text-gray-400 tabular-nums shrink-0">{formatAmount(scaled)}</span>
                    </button>

                    {/* Substitution panel */}
                    {isActive && (
                      <div className="mx-2 mb-1 mt-0.5 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                        {subsLoading && (
                          <div className="flex items-center gap-2 text-xs text-teal-600">
                            <Loader2 size={13} className="animate-spin" /> Szukam zamienników…
                          </div>
                        )}
                        {subsData && (
                          <div className="space-y-2">
                            {subsData.note && (
                              <p className="text-xs text-teal-700 font-medium">{subsData.note}</p>
                            )}
                            {subsData.substitutes.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Zamienniki z reguł diety:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {subsData.substitutes.map((s) => (
                                    <span
                                      key={s.name}
                                      className={`inline-block text-xs px-2.5 py-1 rounded-full ${
                                        s.inDatabase
                                          ? 'bg-white border border-teal-200 text-teal-700'
                                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                                      }`}
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {subsData.categoryMatches.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Inne w tej kategorii:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {subsData.categoryMatches.slice(0, 8).map((s) => (
                                    <span
                                      key={s.name}
                                      className="inline-block text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600"
                                    >
                                      {s.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {subsData.substitutes.length === 0 && subsData.categoryMatches.length === 0 && (
                              <p className="text-xs text-gray-400">Brak znanych zamienników.</p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSubsFor(null); setSubsData(null); }}
                              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1"
                            >
                              <X size={11} /> Zamknij
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Sposób przygotowania
              </p>
              <ol className="space-y-3">
                {instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Source */}
          {recipe.sourceDiet && (
            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs text-gray-300">Źródło: {recipe.sourceDiet}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
