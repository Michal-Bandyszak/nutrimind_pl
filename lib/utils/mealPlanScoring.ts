import {
  inferRecipeSemantics,
  hasSemanticOverlap,
  type RecipeSemantics,
} from '@/lib/utils/recipeSemantics';

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

type RecipeSelectionOptions = {
  usedIds: Set<string>;
  requiredStorageDays: number;
  targetKcalPerServing: number;
  preferredRecipeId?: string | null;
  mealType?: string;
  daysInGroup?: number[];
  dayContexts?: PlanDayContexts;
  dayKcalTotals?: PlanDayKcalTotals;
  cumulativeTargetKcal?: number;
};

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
  const batchPenalty = requiredStorageDays > 1 && recipe.batchFriendly === false ? 150 : 0;
  const preferredPenalty = preferredRecipeId && recipe.id !== preferredRecipeId ? 120 : 0;
  const diversityPenalty = mealType && dayContexts
    ? semanticPenaltyForGroup(recipe, mealType, daysInGroup, dayContexts)
    : 0;
  const dayBalancePenalty = dayKcalTotals && cumulativeTargetKcal
    ? dailyBalancePenaltyForGroup(recipe, daysInGroup, dayKcalTotals, cumulativeTargetKcal)
    : 0;

  return kcalPenalty + storagePenalty + reusePenalty + batchPenalty + preferredPenalty + diversityPenalty + dayBalancePenalty;
}

export function chooseRecipeForGroup(
  recipes: RecipeCandidate[],
  options: RecipeSelectionOptions,
): RecipeCandidate {
  return recipes.reduce((best, recipe) => {
    const bestScore = recipeSelectionScore(best, options);
    const score = recipeSelectionScore(recipe, options);
    return score < bestScore ? recipe : best;
  }, recipes[0]);
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
