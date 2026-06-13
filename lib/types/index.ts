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
  _count?: { mealPlanMeals: number };
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
  second_breakfast: MealDividers;
  lunch: MealDividers;
  dinner: MealDividers;
  cocktail: MealDividers;
};

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  // Mon-Tue | Wed-Thu | Fri-Sat | Sunday solo
  breakfast:        [false, true,  false, true,  false, true],
  second_breakfast: [false, true,  false, true,  false, true],
  lunch:            [false, true,  false, true,  false, true],
  dinner:           [false, true,  false, true,  false, true],
  cocktail:         [false, true,  false, true,  false, true],
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
  second_breakfast: MealWithRecipe | null;
  lunch: MealWithRecipe | null;
  dinner: MealWithRecipe | null;
  cocktail: MealWithRecipe | null;
  snacks: MealWithRecipe[];
};

// Shopping list types
export type ShoppingIngredient = {
  ingredientId: string;
  name: string;
  category: string;
  totalG: number;
  displayAmount: string;       // "13 szt." for piece-based, "350 g" for weight-based
  packageSizeG: number | null;
  packageUnit: string | null;
  packageLabel: string | null;
  pieceWeightG: number | null; // grams per piece (e.g. egg = 60g) — null = weight-based
  packagesNeeded: number | null;
  leftoverG: number | null;
  leftoverDisplay: string | null; // "7 szt." or "~200g"
  usedIn: {
    recipeName: string;
    mealType: string;
    days: number[];
    amountG: number;
  }[];
};

export type LeftoverItem = {
  name: string;
  leftoverDisplay: string;  // "7 szt." or "~200g"
  packageInfo: string | null; // "2 × karton 10 szt."
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
  leftovers: LeftoverItem[];  // items with significant leftovers after buying full packages
};
