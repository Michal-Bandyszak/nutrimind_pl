'use client';

import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Users, Minus, Plus, ArrowRightLeft, Loader2, X, Star } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import type { SubstitutionResult } from '@/lib/services/SubstitutionEngine';
import {
  TYPE_COLORS,
  MEAL_TYPE_LABELS,
  getRecipeBrowserNote,
  getRecipeBrowserRole,
  getRecipeBrowserVariantLabel,
  isRecipe2500Variant,
  type RecipeBrowserMeta,
} from '@/lib/utils/recipeConstants';
import { formatIngredientAmount, scaleAmount, safeJsonParse } from '@/lib/utils/formatUnits';

type Props = {
  recipe: RecipeWithIngredients;
  expanded: boolean;
  onToggle: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export default function RecipeCard({
  recipe, expanded, onToggle, isFavorite, onToggleFavorite,
}: Props) {
  const isPerWhole = recipe.ingredientBasis === 'per-whole';
  const baseServings = recipe.baseServings || 1;
  const [servings, setServings] = useState(isPerWhole ? baseServings : 2);
  const [subsFor, setSubsFor] = useState<string | null>(null);
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

  const instructions = safeJsonParse<string[]>(recipe.instructions, []);
  const recipeTags = safeJsonParse<string[]>(recipe.tags, []);
  const recipeMeta = recipe as RecipeWithIngredients & RecipeBrowserMeta;
  const recipeRole = getRecipeBrowserRole(recipeMeta);
  const variantLabel = getRecipeBrowserVariantLabel(recipeMeta);
  const adjustmentNote = getRecipeBrowserNote(recipeMeta);
  const isVariant2500 = isRecipe2500Variant(recipeMeta);

  const macroScale = servings;
  const maxServings = isPerWhole ? Math.max(baseServings * 2, 8) : 8;

  return (
    <div className="panel-surface rounded-[1.5rem] overflow-hidden">
      {/* Summary row (always visible, clickable) */}
      <div className="px-4 py-4 hover:bg-gray-50/70 transition-colors">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="flex-1 min-w-0 text-left"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[recipe.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {MEAL_TYPE_LABELS[recipe.type] ?? recipe.type}
              </span>
              {recipeRole === 'component' && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Komponent
                </span>
              )}
              {recipeRole === 'base' && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Baza
                </span>
              )}
              {variantLabel && (
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                  isVariant2500
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-fuchsia-100 text-fuchsia-700'
                }`}>
                  {variantLabel}
                </span>
              )}
              {recipeTags.includes('zupa') && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">
                  Zupa
                </span>
              )}
              {recipe.source === 'user' ? (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Własny
                </span>
              ) : null}
              {isPerWhole && baseServings > 1 && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  <Users size={10} /> {baseServings} porcji
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{recipe.name}</h3>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              {recipe.kcalPerServing && (
                <span className="font-medium text-gray-600">{Math.round(recipe.kcalPerServing)} kcal</span>
              )}
              {recipe.proteinG && <span>B {Math.round(recipe.proteinG)}g</span>}
              {recipe.carbsG && <span>W {Math.round(recipe.carbsG)}g</span>}
              {recipe.fatG && <span>T {Math.round(recipe.fatG)}g</span>}
              {recipe.kcalPerServing && <span className="text-gray-300">/ 1 porcja</span>}
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {(recipe.prepTimeMin || recipe.cookTimeMin) && (
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <Clock size={12} />
                {(recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0)} min
              </span>
            )}
            {recipe._count && recipe._count.mealPlanMeals > 0 && (
              <span className="text-xs text-gray-300" title="Razy użyto w planach">
                ×{recipe._count.mealPlanMeals}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              className="p-0.5 transition-colors"
            >
              <Star
                size={15}
                className={isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-300'}
              />
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? 'Zwiń przepis' : 'Rozwiń przepis'}
              aria-expanded={expanded}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border">
          {adjustmentNote && (
            <div className={`px-4 py-2 border-b ${
              isVariant2500
                ? 'bg-violet-50 border-violet-100'
                : 'bg-gray-50/80 border-border'
            }`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {isVariant2500 ? 'Notatka wariantu 2500' : 'Notatka przepisu'}
              </p>
              <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                {adjustmentNote}
              </p>
            </div>
          )}

          {/* Servings scaler */}
          <div className="px-4 py-3 bg-gray-50/80 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users size={15} className="text-teal-600" />
              <span className="font-medium">Porcje</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setServings(Math.max(1, servings - 1)); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-gray-500 hover:border-teal-400 hover:text-teal-700 transition active:scale-95"
                aria-label="Mniej porcji"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-900">{servings}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setServings(Math.min(maxServings, servings + 1)); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-gray-500 hover:border-teal-400 hover:text-teal-700 transition active:scale-95"
                aria-label="Więcej porcji"
              >
                <Plus size={13} />
              </button>
              {isPerWhole && baseServings > 1 && servings !== baseServings && (
                <button
                  onClick={(e) => { e.stopPropagation(); setServings(baseServings); }}
                  className="ml-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition whitespace-nowrap"
                >
                  Cały przepis
                </button>
              )}
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
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Składniki
                </p>
                {isPerWhole && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Przepis na {baseServings} porcji — skalowane z całej formy
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-300">kliknij składnik → zamienniki</p>
            </div>
            <ul className="space-y-1">
              {recipe.ingredients.map((ri) => {
                const perServing = isPerWhole ? ri.amountG / baseServings : ri.amountG;
                const scaled = scaleAmount(perServing, servings, ri.scalesLinearly);
                const isActive = subsFor === ri.ingredient.id;
                return (
                  <li key={ri.id}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleIngredientClick(ri.ingredient.id); }}
                      className={`w-full flex items-baseline justify-between gap-2 text-sm px-2 py-1.5 rounded-lg transition-colors text-left ${
                        isActive ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <span className="text-gray-700 flex items-center gap-1.5">
                        {ri.ingredient.name}
                        {isActive && <ArrowRightLeft size={12} className="text-teal-500" />}
                      </span>
                      <span className="text-gray-400 tabular-nums shrink-0">
                        {formatIngredientAmount(scaled, ri.ingredient.pieceWeightG, ri.ingredient.hintUnitG, ri.ingredient.hintUnit)}
                      </span>
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
