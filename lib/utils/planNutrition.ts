import type { MealPlanWithMeals, MealWithRecipe } from '@/lib/types';
import { DEFAULT_TARGET_KCAL_PER_PERSON } from '@/lib/utils/mealPlanScoring';

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

export function buildPlanNutritionDiagnostics(
  plan: MealPlanWithMeals,
  targetKcalPerPerson = DEFAULT_TARGET_KCAL_PER_PERSON,
  tolerance = DAILY_KCAL_TOLERANCE,
) {
  const primary = plan.participants.find((participant) => participant.isPrimarySnapshot)
    ?? plan.participants[0];
  const participantId = primary?.id;
  const daily = Array.from({ length: 7 }, (_, idx) => {
    const dayOfWeek = idx + 1;
    const meals = plan.meals.filter((meal) => meal.dayOfWeek === dayOfWeek);
    const totals = summarizeMealsPerPerson(meals, participantId);
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
    participants: plan.participants.map((participant) => {
      const participantDaily = Array.from({ length: 7 }, (_, idx) => {
        const meals = plan.meals.filter((meal) => meal.dayOfWeek === idx + 1);
        return Math.round(summarizeMealsPerPerson(meals, participant.id).kcal);
      });
      return {
        id: participant.id,
        name: participant.nameSnapshot,
        targetKcal: participant.targetKcalSnapshot,
        averageKcal: Math.round(
          participantDaily.reduce((sum, kcal) => sum + kcal, 0) / participantDaily.length,
        ),
      };
    }),
  };
}
