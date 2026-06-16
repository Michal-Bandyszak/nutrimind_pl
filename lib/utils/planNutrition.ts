import type { MealPlanWithMeals, MealWithRecipe } from '@/lib/types';
import { DEFAULT_TARGET_KCAL_PER_PERSON } from '@/lib/utils/mealPlanScoring';

export const PLAN_PEOPLE_COUNT = 2;
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

export function mealServingSharePerPerson(meal: MealWithRecipe) {
  if (CORE_MEAL_TYPES.has(meal.mealType)) return 1;
  return meal.servings / PLAN_PEOPLE_COUNT;
}

export function mealNutritionPerPerson(meal: MealWithRecipe) {
  const perServing = mealNutritionPerServing(meal);
  const share = mealServingSharePerPerson(meal);

  return {
    kcal: perServing.kcal * share,
    protein: perServing.protein * share,
    carbs: perServing.carbs * share,
    fat: perServing.fat * share,
  };
}

export function summarizeMealsPerPerson(meals: MealWithRecipe[]) {
  return meals.reduce(
    (acc, meal) => {
      const nutrition = mealNutritionPerPerson(meal);
      acc.kcal += nutrition.kcal;
      acc.protein += nutrition.protein;
      acc.carbs += nutrition.carbs;
      acc.fat += nutrition.fat;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function buildPlanNutritionDiagnostics(
  plan: MealPlanWithMeals,
  targetKcalPerPerson = DEFAULT_TARGET_KCAL_PER_PERSON,
  tolerance = DAILY_KCAL_TOLERANCE,
) {
  const daily = Array.from({ length: 7 }, (_, idx) => {
    const dayOfWeek = idx + 1;
    const meals = plan.meals.filter((meal) => meal.dayOfWeek === dayOfWeek);
    const totals = summarizeMealsPerPerson(meals);
    const kcal = Math.round(totals.kcal);
    const delta = kcal - targetKcalPerPerson;

    return {
      dayOfWeek,
      kcal,
      delta,
      outsideTolerance: Math.abs(delta) > tolerance,
    };
  });

  const kcalValues = daily.map((day) => day.kcal);
  const totalKcal = kcalValues.reduce((sum, kcal) => sum + kcal, 0);
  const batchCount = new Set(
    plan.meals
      .map((meal) => meal.batchGroupId)
      .filter((batchGroupId): batchGroupId is string => Boolean(batchGroupId)),
  ).size;

  return {
    targetKcalPerPerson,
    tolerance,
    daily,
    averageKcal: Math.round(totalKcal / daily.length),
    minKcal: Math.min(...kcalValues),
    maxKcal: Math.max(...kcalValues),
    batchCount,
    daysOutsideTolerance: daily.filter((day) => day.outsideTolerance).length,
  };
}
