import type { MealWithRecipe } from '@/lib/types';

export const DAILY_KCAL_TOLERANCE = 150;

const CORE_MEAL_TYPES = new Set([
  'breakfast',
  'second_breakfast',
  'lunch',
  'dinner',
  'cocktail',
]);

export function mealNutritionPerServing(meal: MealWithRecipe) {
  return {
    kcal: meal.recipe.kcalPerServing ?? 0,
    protein: meal.recipe.proteinG ?? 0,
    carbs: meal.recipe.carbsG ?? 0,
    fat: meal.recipe.fatG ?? 0,
  };
}

export function mealServingSharePerPerson(meal: MealWithRecipe, participantId?: string) {
  if (participantId) {
    return meal.portions.find((portion) => portion.participantId === participantId)?.servings ?? 0;
  }
  if (CORE_MEAL_TYPES.has(meal.mealType)) return meal.portions[0]?.servings ?? 1;
  return meal.portions[0]?.servings ?? meal.servings;
}

export function mealNutritionPerPerson(meal: MealWithRecipe, participantId?: string) {
  const perServing = mealNutritionPerServing(meal);
  const share = mealServingSharePerPerson(meal, participantId);

  return {
    kcal: perServing.kcal * share,
    protein: perServing.protein * share,
    carbs: perServing.carbs * share,
    fat: perServing.fat * share,
  };
}

export function summarizeMealsPerPerson(meals: MealWithRecipe[], participantId?: string) {
  return meals.reduce(
    (acc, meal) => {
      const nutrition = mealNutritionPerPerson(meal, participantId);
      acc.kcal += nutrition.kcal;
      acc.protein += nutrition.protein;
      acc.carbs += nutrition.carbs;
      acc.fat += nutrition.fat;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
