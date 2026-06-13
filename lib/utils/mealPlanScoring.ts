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
  maxStorageDays: number;
  kcalPerServing: number | null;
  batchFriendly?: boolean;
};

type RecipeSelectionOptions = {
  usedIds: Set<string>;
  requiredStorageDays: number;
  targetKcalPerServing: number;
  preferredRecipeId?: string | null;
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

export function recipeSelectionScore(
  recipe: RecipeCandidate,
  {
    usedIds,
    requiredStorageDays,
    targetKcalPerServing,
    preferredRecipeId,
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

  return kcalPenalty + storagePenalty + reusePenalty + batchPenalty + preferredPenalty;
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
