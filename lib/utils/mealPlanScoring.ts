import {
  inferRecipeSemantics,
  hasSemanticOverlap,
  normalizeRecipeTags,
  primarySemanticFamily,
  type RecipeSemantics,
} from './recipeSemantics';

export const DEFAULT_TARGET_KCAL_PER_PERSON = 2500;

export const MEAL_TARGET_WEIGHTS: Record<string, number> = {
  breakfast: 0.25,
  second_breakfast: 0.15,
  lunch: 0.30,
  dinner: 0.30,
  cocktail: 0.08,
};

export type RecipeCandidate = {
  id: string;
  name: string;
  role?: string;
  nutritionReady?: boolean;
  maxStorageDays: number;
  kcalPerServing: number | null;
  batchFriendly?: boolean;
  tags?: string | null;
  ingredientNames?: string[];
};

export type DayContextEntry = RecipeSemantics & {
  mealType: string;
};

export type PlanDayContexts = Map<number, DayContextEntry[]>;
export type PlanDayKcalTotals = Map<number, number>;

const BALANCED_PREFERENCE_BONUSES: Record<string, number> = {
  'profil:srodziemnomorski': 60,
  lokalne: 20,
  budzetowe: 20,
};

type RecipeSelectionOptions = {
  usedIds: Set<string>;
  requiredStorageDays: number;
  targetKcalPerServing: number;
  preferredRecipeId?: string | null;
  previousPlanRecipeIds?: ReadonlySet<string>;
  mealType?: string;
  daysInGroup?: number[];
  dayContexts?: PlanDayContexts;
  dayKcalTotals?: PlanDayKcalTotals;
  cumulativeTargetKcal?: number;
  familyCounts?: Map<string, number>;
  familyLimit?: number;
  random?: () => number;
};

export class NoEligibleRecipeError extends Error {
  readonly code = 'NO_ELIGIBLE_RECIPE';

  constructor(readonly mealType: string, readonly batchDays: number) {
    super(`Brak bezpiecznego przepisu dla ${mealType} na blok ${batchDays} dni.`);
    this.name = 'NoEligibleRecipeError';
  }
}

export function buildMealTargets(
  mealTypes: string[],
  targetKcalPerPerson: number,
): Record<string, number> {
  const totalWeight = mealTypes.reduce(
    (sum, mealType) => sum + (MEAL_TARGET_WEIGHTS[mealType] ?? 1),
    0,
  );

  return Object.fromEntries(
    mealTypes.map((mealType) => [
      mealType,
      targetKcalPerPerson * ((MEAL_TARGET_WEIGHTS[mealType] ?? 1) / totalWeight),
    ]),
  );
}

export function buildCumulativeMealTargets(
  mealTypes: string[],
  targetKcalPerPerson: number,
) {
  const mealTargets = buildMealTargets(mealTypes, targetKcalPerPerson);
  let running = 0;

  return Object.fromEntries(
    mealTypes.map((mealType) => {
      running += mealTargets[mealType] ?? 0;
      return [mealType, running];
    }),
  ) as Record<string, number>;
}

export function recipeSelectionScore(
  recipe: RecipeCandidate,
  {
    usedIds,
    requiredStorageDays,
    targetKcalPerServing,
    preferredRecipeId,
    previousPlanRecipeIds,
    mealType,
    daysInGroup = [],
    dayContexts,
    dayKcalTotals,
    cumulativeTargetKcal,
  }: RecipeSelectionOptions,
) {
  const kcal = recipe.kcalPerServing;
  const kcalPenalty = kcal && kcal > 0
    ? Math.abs(kcal - targetKcalPerServing)
    : targetKcalPerServing + 5000;
  const storagePenalty = recipe.maxStorageDays >= requiredStorageDays
    ? 0
    : 10000 + (requiredStorageDays - recipe.maxStorageDays) * 1000;
  const reusePenalty = usedIds.has(recipe.id) ? 750 : 0;
  const previousPlanPenalty = previousPlanRecipeIds?.has(recipe.id) ? 400 : 0;
  const preferredPenalty = preferredRecipeId && recipe.id !== preferredRecipeId ? 120 : 0;
  const diversityPenalty = mealType && dayContexts
    ? semanticPenaltyForGroup(recipe, mealType, daysInGroup, dayContexts)
    : 0;
  const dayBalancePenalty = dayKcalTotals && cumulativeTargetKcal
    ? dailyBalancePenaltyForGroup(recipe, daysInGroup, dayKcalTotals, cumulativeTargetKcal)
    : 0;
  const balancedPreferenceBonus = normalizeRecipeTags(recipe.tags).reduce(
    (sum, tag) => sum + (BALANCED_PREFERENCE_BONUSES[tag] ?? 0),
    0,
  );

  return kcalPenalty
    + storagePenalty
    + reusePenalty
    + previousPlanPenalty
    + preferredPenalty
    + diversityPenalty
    + dayBalancePenalty
    - balancedPreferenceBonus;
}

export function chooseRecipeForGroup(
  recipes: RecipeCandidate[],
  options: RecipeSelectionOptions,
): RecipeCandidate {
  const {
    mealType = 'meal',
    requiredStorageDays,
    familyCounts,
    familyLimit = 2,
  } = options;
  const eligible = recipes.filter((recipe) => (
    recipe.role !== 'component'
    && recipe.nutritionReady !== false
    && recipe.kcalPerServing != null
    && recipe.kcalPerServing > 0
    && recipe.maxStorageDays >= requiredStorageDays
    && (mealType !== 'lunch' || requiredStorageDays <= 1 || recipe.batchFriendly === true)
  ));

  if (!eligible.length) throw new NoEligibleRecipeError(mealType, requiredStorageDays);

  const capped = familyCounts
    ? eligible.filter((recipe) => {
        const family = primarySemanticFamily(buildDayContextEntry(recipe, mealType));
        return (familyCounts.get(`${mealType}:${family}`) ?? 0) < familyLimit;
      })
    : eligible;
  const pool = capped.length ? capped : eligible;
  const ranked = pool
    .map((recipe) => ({ recipe, score: recipeSelectionScore(recipe, options) }))
    .sort((a, b) => a.score - b.score || a.recipe.id.localeCompare(b.recipe.id));
  const top = ranked.slice(0, 5);
  const random = options.random ?? Math.random;
  const totalWeight = top.reduce((sum, _entry, index) => sum + top.length - index, 0);
  let threshold = Math.min(1 - Number.EPSILON, Math.max(0, random())) * totalWeight;
  for (let index = 0; index < top.length; index += 1) {
    threshold -= top.length - index;
    if (threshold < 0) return top[index].recipe;
  }
  return top[top.length - 1].recipe;
}

export function buildDayContextEntry(recipe: RecipeCandidate, mealType: string): DayContextEntry {
  return {
    mealType,
    ...inferRecipeSemantics({
      name: recipe.name,
      tags: recipe.tags,
      ingredientNames: recipe.ingredientNames,
    }),
  };
}

export function applyRecipeToDayContexts(
  dayContexts: PlanDayContexts,
  recipe: RecipeCandidate,
  mealType: string,
  days: number[],
) {
  const entry = buildDayContextEntry(recipe, mealType);
  for (const day of days) {
    const existing = dayContexts.get(day) ?? [];
    dayContexts.set(
      day,
      [...existing.filter((item) => item.mealType !== mealType), entry],
    );
  }
}

export function applyRecipeToDayKcalTotals(
  dayKcalTotals: PlanDayKcalTotals,
  recipe: RecipeCandidate,
  days: number[],
) {
  const kcal = recipe.kcalPerServing ?? 0;
  for (const day of days) {
    dayKcalTotals.set(day, (dayKcalTotals.get(day) ?? 0) + kcal);
  }
}

function semanticPenaltyForGroup(
  recipe: RecipeCandidate,
  mealType: string,
  daysInGroup: number[],
  dayContexts: PlanDayContexts,
) {
  const semantics = buildDayContextEntry(recipe, mealType);
  let penalty = 0;

  for (const day of daysInGroup) {
    const entries = dayContexts.get(day) ?? [];
    for (const entry of entries) {
      if (mealType === 'dinner' && entry.mealType === 'breakfast') {
        if (hasSemanticOverlap(semantics.families, ['porridge']) && hasSemanticOverlap(entry.families, ['porridge'])) {
          penalty += 2400;
        }
        if (hasSemanticOverlap(semantics.proteins, ['egg']) && hasSemanticOverlap(entry.proteins, ['egg'])) {
          penalty += 2400;
        }
      }

      if (hasSemanticOverlap(semantics.families, entry.families)) penalty += 240;
      if (hasSemanticOverlap(semantics.formats, entry.formats)) penalty += 120;
      if (hasSemanticOverlap(semantics.proteins, entry.proteins)) penalty += 90;
    }
  }

  return penalty;
}

function dailyBalancePenaltyForGroup(
  recipe: RecipeCandidate,
  daysInGroup: number[],
  dayKcalTotals: PlanDayKcalTotals,
  cumulativeTargetKcal: number,
) {
  const kcal = recipe.kcalPerServing;
  if (!kcal || kcal <= 0) return 0;

  return daysInGroup.reduce((penalty, day) => {
    const projectedTotal = (dayKcalTotals.get(day) ?? 0) + kcal;
    return penalty + Math.abs(projectedTotal - cumulativeTargetKcal) * 2;
  }, 0);
}
