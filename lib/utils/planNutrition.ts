import type { MealWithRecipe } from '@/lib/types';

export const PLAN_PEOPLE_COUNT = 2;

export function mealNutritionPerServing(meal: MealWithRecipe) {
  return {
    kcal: meal.recipe.kcalPerServing ?? 0,
    protein: meal.recipe.proteinG ?? 0,
    carbs: meal.recipe.carbsG ?? 0,
    fat: meal.recipe.fatG ?? 0,
  };
}
