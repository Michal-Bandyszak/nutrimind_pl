export type NutritionReadinessInput = {
  kcalPerServing: number | null | undefined;
  proteinG: number | null | undefined;
  carbsG: number | null | undefined;
  fatG: number | null | undefined;
  ingredientsValid?: boolean;
  componentsValid?: boolean;
};

function isFiniteNonNegative(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isNutritionReady({
  kcalPerServing,
  proteinG,
  carbsG,
  fatG,
  ingredientsValid = true,
  componentsValid = true,
}: NutritionReadinessInput) {
  if (!isFiniteNonNegative(kcalPerServing) || kcalPerServing <= 0) return false;
  if (!isFiniteNonNegative(proteinG) || !isFiniteNonNegative(carbsG) || !isFiniteNonNegative(fatG)) {
    return false;
  }
  if (!ingredientsValid || !componentsValid) return false;

  const kcalFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
  return Math.abs(kcalPerServing - kcalFromMacros) / kcalPerServing <= 0.1;
}
