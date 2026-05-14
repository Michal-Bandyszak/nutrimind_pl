import type { MealPlanWithMeals, BatchConfig, MealDividers } from '@/lib/types';

/**
 * Reverse-engineers the batch config (dividers) from an existing meal plan.
 * A divider exists between two adjacent days if they have different batchGroupIds.
 */
export function planToBatchConfig(plan: MealPlanWithMeals): BatchConfig {
  return {
    breakfast:        mealTypeToDividers(plan, 'breakfast'),
    second_breakfast: mealTypeToDividers(plan, 'second_breakfast'),
    lunch:            mealTypeToDividers(plan, 'lunch'),
    dinner:           mealTypeToDividers(plan, 'dinner'),
    cocktail:         mealTypeToDividers(plan, 'cocktail'),
  };
}

function mealTypeToDividers(plan: MealPlanWithMeals, mealType: string): MealDividers {
  const dividers: MealDividers = [false, false, false, false, false, false];

  // Build a day→batchGroupId lookup (days are 1-7)
  const dayToBatch = new Map<number, string | null>();
  for (const m of plan.meals) {
    if (m.mealType === mealType) dayToBatch.set(m.dayOfWeek, m.batchGroupId);
  }

  // dividers[i] = break between day (i+1) and day (i+2)
  for (let i = 0; i < 6; i++) {
    const batchA = dayToBatch.get(i + 1);
    const batchB = dayToBatch.get(i + 2);
    if (batchA !== undefined && batchB !== undefined && batchA !== batchB) {
      dividers[i] = true;
    }
  }
  return dividers;
}
