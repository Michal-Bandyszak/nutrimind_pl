import type { MealPlanWithMeals, BatchConfig, MealDividers } from '@/lib/types';

/**
 * Reverse-engineers the batch config (dividers) from an existing meal plan.
 * A divider exists between two adjacent days if they have different batchGroupIds.
 */
export function planToBatchConfig(plan: MealPlanWithMeals): BatchConfig {
  return {
    breakfast: mealTypeToDividers(plan, 'breakfast'),
    lunch:     mealTypeToDividers(plan, 'lunch'),
    dinner:    mealTypeToDividers(plan, 'dinner'),
  };
}

function mealTypeToDividers(plan: MealPlanWithMeals, mealType: string): MealDividers {
  const dividers: MealDividers = [false, false, false, false, false, false];

  const sorted = plan.meals
    .filter((m) => m.mealType === mealType)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  for (let i = 0; i < 6 && i + 1 < sorted.length; i++) {
    if (sorted[i].batchGroupId !== sorted[i + 1].batchGroupId) {
      dividers[i] = true;
    }
  }
  return dividers;
}
