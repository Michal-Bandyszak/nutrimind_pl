import type {
  Recipe,
  Ingredient,
  RecipeIngredient,
  MealPlan,
  MealPlanMeal,
} from '@prisma/client';

export type { Recipe, Ingredient, RecipeIngredient, MealPlan, MealPlanMeal };

// Extended types with relations
export type RecipeWithIngredients = Recipe & {
  ingredients: (RecipeIngredient & {
    ingredient: Ingredient;
  })[];
};

export type MealWithRecipe = MealPlanMeal & {
  recipe: RecipeWithIngredients;
};

export type MealPlanWithMeals = MealPlan & {
  meals: MealWithRecipe[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Batch configuration
// ──────────────────────────────────────────────────────────────────────────────

/**
 * 6-element boolean array — divider[i] = true means there's a break between
 * day (i+1) and day (i+2), so they get different recipes.
 * index: 0=Mon/Tue, 1=Tue/Wed, 2=Wed/Thu, 3=Thu/Fri, 4=Fri/Sat, 5=Sat/Sun
 */
export type MealDividers = [boolean, boolean, boolean, boolean, boolean, boolean];

export type BatchConfig = {
  breakfast: MealDividers;
  lunch: MealDividers;
  dinner: MealDividers;
};

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  // Mon-Wed same recipe | Thu-Sun same recipe
  breakfast: [false, false, true, false, false, false],
  lunch:     [false, false, true, false, false, false],
  dinner:    [false, false, true, false, false, false],
};

/** Convert dividers array → group numbers array (length 7) */
export function dividersToGroups(dividers: MealDividers): number[] {
  const groups: number[] = [1];
  for (let i = 0; i < 6; i++) {
    groups.push(dividers[i] ? groups[i] + 1 : groups[i]);
  }
  return groups; // e.g. [1,1,1,2,2,2,2]
}

// Organized by day for the week view
export type DayMeals = {
  dayOfWeek: number;
  dayName: string;
  dateLabel: string;
  breakfast: MealWithRecipe | null;
  lunch: MealWithRecipe | null;
  dinner: MealWithRecipe | null;
  snacks: MealWithRecipe[];
};

// Shopping list types
export type ShoppingIngredient = {
  ingredientId: string;
  name: string;
  category: string;
  totalG: number;
  displayAmount: string;
  packageSizeG: number | null;
  packageUnit: string | null;
  packageLabel: string | null;
  packagesNeeded: number | null;
  leftoverG: number | null;
  usedIn: {
    recipeName: string;
    mealType: string;
    days: number[];
    amountG: number;
  }[];
};

export type ShoppingCategory = {
  category: string;
  label: string;
  emoji: string;
  items: ShoppingIngredient[];
};

export type ShoppingList = {
  planId: string;
  planName: string;
  categories: ShoppingCategory[];
  totalItems: number;
};
