const FLEXIBLE_MEAL_TYPES = new Set(['extra']);
const BATCH_FRIENDLY_REQUIRED_TYPES = new Set(['lunch']);

export const MAX_REPLACEMENT_KCAL_DELTA = 350;

export type GuardRecipe = {
  role?: string;
  type: string;
  nutritionVerified: boolean;
  maxStorageDays: number;
  kcalPerServing: number | null;
  batchFriendly: boolean;
};

export function recipeMatchesMealSlot(recipeType: string, mealType: string) {
  return FLEXIBLE_MEAL_TYPES.has(mealType) || recipeType === mealType;
}

export function validateRecipeForMealSlot({
  recipe,
  mealType,
  batchDays,
  currentKcalPerServing,
}: {
  recipe: GuardRecipe;
  mealType: string;
  batchDays: number;
  currentKcalPerServing?: number | null;
}) {
  if (recipe.role === 'component') {
    return 'Baza lub pasta nie może być dodana bezpośrednio do slotu posiłku.';
  }

  if (!recipeMatchesMealSlot(recipe.type, mealType)) {
    return 'Ten przepis ma inny typ posiłku niż wybrany slot.';
  }

  if (!recipe.nutritionVerified || recipe.kcalPerServing == null) {
    return 'Ten przepis nie ma zweryfikowanej kaloryczności.';
  }

  if (batchDays > 1 && recipe.maxStorageDays < batchDays) {
    return `Ten przepis wytrzymuje ${recipe.maxStorageDays} dni, a grupa ma ${batchDays} dni.`;
  }

  if (
    batchDays > 1 &&
    BATCH_FRIENDLY_REQUIRED_TYPES.has(mealType) &&
    !recipe.batchFriendly
  ) {
    return 'Ten przepis nie jest oznaczony jako dobry do batch cookingu.';
  }

  if (
    currentKcalPerServing != null &&
    recipe.kcalPerServing != null &&
    Math.abs(recipe.kcalPerServing - currentKcalPerServing) > MAX_REPLACEMENT_KCAL_DELTA
  ) {
    return `Ta zamiana zmienia posiłek o ponad ${MAX_REPLACEMENT_KCAL_DELTA} kcal na porcję.`;
  }

  return null;
}
