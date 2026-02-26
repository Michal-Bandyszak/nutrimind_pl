import { prisma } from '@/lib/db/prisma';
import type { ShoppingList, ShoppingIngredient, ShoppingCategory, LeftoverItem } from '@/lib/types';

type IngredientRaw = {
  id: string;
  name: string;
  category: string;
  packageSizeG: number | null;
  packageUnit: string | null;
  packageLabel: string | null;
  pieceWeightG: number | null;
};

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; order: number }> = {
  vegetables: { label: 'Warzywa',            emoji: '🥦', order: 1 },
  fruits:     { label: 'Owoce',              emoji: '🍎', order: 2 },
  protein:    { label: 'Białko (mięso/ryby)', emoji: '🥩', order: 3 },
  dairy:      { label: 'Nabiał i jaja',      emoji: '🧀', order: 4 },
  grains:     { label: 'Zboża i kasze',      emoji: '🌾', order: 5 },
  oils:       { label: 'Oleje i tłuszcze',   emoji: '🫒', order: 6 },
  spices:     { label: 'Przyprawy i zioła',  emoji: '🌿', order: 7 },
  other:      { label: 'Inne',               emoji: '🛒', order: 8 },
};

function scaleAmount(amountG: number, servings: number, scalesLinearly: boolean): number {
  if (scalesLinearly) return amountG * servings;
  return amountG * Math.sqrt(servings); // sqrt scaling for oils/spices
}

function formatAmount(grams: number, pieceWeightG?: number | null): string {
  if (pieceWeightG && pieceWeightG > 0) {
    const pieces = Math.round(grams / pieceWeightG);
    return `${pieces} szt.`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`;
  }
  if (grams < 5) return `${Math.round(grams * 10) / 10} g`;
  return `${Math.round(grams / 5) * 5} g`;
}

function formatLeftover(leftoverG: number, pieceWeightG?: number | null): string {
  if (pieceWeightG && pieceWeightG > 0) {
    const pieces = Math.round(leftoverG / pieceWeightG);
    return `${pieces} szt.`;
  }
  return `~${Math.round(leftoverG)} g`;
}

function addIngredient(
  map: Map<string, ShoppingIngredient>,
  ingredient: IngredientRaw,
  amountG: number,
  usage: { recipeName: string; mealType: string; days: number[]; amountG: number },
) {
  const existing = map.get(ingredient.id);
  if (existing) {
    existing.totalG += amountG;
    existing.usedIn.push(usage);
  } else {
    map.set(ingredient.id, {
      ingredientId: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      totalG: amountG,
      displayAmount: '',
      packageSizeG: ingredient.packageSizeG,
      packageUnit: ingredient.packageUnit,
      packageLabel: ingredient.packageLabel,
      pieceWeightG: ingredient.pieceWeightG,
      packagesNeeded: null,
      leftoverG: null,
      leftoverDisplay: null,
      usedIn: [usage],
    });
  }
}

export async function buildShoppingList(planId: string): Promise<ShoppingList> {
  const plan = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: planId },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true, name: true, category: true,
                      packageSizeG: true, packageUnit: true, packageLabel: true,
                      pieceWeightG: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Group meals by batchGroupId → { recipe, days[] }
  const batchGroups = new Map<string, { meal: typeof plan.meals[0]; days: number[] }>();
  const unbatched: typeof plan.meals = [];

  for (const meal of plan.meals) {
    if (meal.batchGroupId) {
      const existing = batchGroups.get(meal.batchGroupId);
      if (existing) {
        existing.days.push(meal.dayOfWeek);
      } else {
        batchGroups.set(meal.batchGroupId, { meal, days: [meal.dayOfWeek] });
      }
    } else {
      unbatched.push(meal);
    }
  }

  const ingredientMap = new Map<string, ShoppingIngredient>();

  // Process batch groups — each batch cooked ONCE, total = servings × days
  for (const { meal, days } of batchGroups.values()) {
    const totalServings = meal.servings * days.length;
    const isPerWhole = meal.recipe.ingredientBasis === 'per-whole';
    const baseServings = meal.recipe.baseServings || 1;
    for (const ri of meal.recipe.ingredients) {
      // per-whole: amountG is for the full recipe (baseServings portions) → normalize to per-serving first
      const perServing = isPerWhole ? ri.amountG / baseServings : ri.amountG;
      const scaled = scaleAmount(perServing, totalServings, ri.scalesLinearly);
      addIngredient(ingredientMap, ri.ingredient, scaled, {
        recipeName: meal.recipe.name,
        mealType: meal.mealType,
        days,
        amountG: scaled,
      });
    }
  }

  // Process unbatched (snacks etc.) — count each day separately
  for (const meal of unbatched) {
    const isPerWhole = meal.recipe.ingredientBasis === 'per-whole';
    const baseServings = meal.recipe.baseServings || 1;
    for (const ri of meal.recipe.ingredients) {
      const perServing = isPerWhole ? ri.amountG / baseServings : ri.amountG;
      const scaled = scaleAmount(perServing, meal.servings, ri.scalesLinearly);
      addIngredient(ingredientMap, ri.ingredient, scaled, {
        recipeName: meal.recipe.name,
        mealType: meal.mealType,
        days: [meal.dayOfWeek],
        amountG: scaled,
      });
    }
  }

  // Finalize: display amounts + package info + leftover calculation
  for (const item of ingredientMap.values()) {
    item.displayAmount = formatAmount(item.totalG, item.pieceWeightG);
    if (item.packageSizeG && item.packageSizeG > 0) {
      item.packagesNeeded = Math.ceil(item.totalG / item.packageSizeG);
      item.leftoverG = item.packagesNeeded * item.packageSizeG - item.totalG;
      item.leftoverDisplay = formatLeftover(item.leftoverG, item.pieceWeightG);
    }
  }

  // Group by category and sort
  const categoryMap = new Map<string, ShoppingIngredient[]>();
  for (const item of ingredientMap.values()) {
    const cat = item.category in CATEGORY_CONFIG ? item.category : 'other';
    const existing = categoryMap.get(cat);
    if (existing) existing.push(item);
    else categoryMap.set(cat, [item]);
  }

  const categories: ShoppingCategory[] = [];
  for (const [cat, items] of categoryMap) {
    const config = CATEGORY_CONFIG[cat] ?? { label: cat, emoji: '🛒', order: 99 };
    categories.push({
      category: cat,
      label: config.label,
      emoji: config.emoji,
      items: items.sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    });
  }
  categories.sort((a, b) => {
    const aOrder = CATEGORY_CONFIG[a.category]?.order ?? 99;
    const bOrder = CATEGORY_CONFIG[b.category]?.order ?? 99;
    return aOrder - bOrder;
  });

  // Build leftovers summary — items with significant leftover (> 20g or ≥ 1 piece)
  const leftovers: LeftoverItem[] = [];
  for (const item of ingredientMap.values()) {
    if (item.leftoverG === null || item.leftoverG <= 0) continue;
    const isSignificant = item.pieceWeightG
      ? item.leftoverG >= item.pieceWeightG        // at least 1 piece
      : item.leftoverG > 20;                       // more than 20g
    if (!isSignificant) continue;
    leftovers.push({
      name: item.name,
      leftoverDisplay: item.leftoverDisplay!,
      packageInfo: item.packagesNeeded && item.packageLabel
        ? `${item.packagesNeeded} × ${item.packageLabel}`
        : null,
    });
  }
  leftovers.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return {
    planId,
    planName: plan.name,
    categories,
    totalItems: ingredientMap.size,
    leftovers,
  };
}
