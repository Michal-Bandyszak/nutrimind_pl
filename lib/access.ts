import { prisma } from '@/lib/db/prisma';

export async function requireOwnedPlan(planId: string, householdId: string) {
  const plan = await prisma.mealPlan.findFirst({ where: { id: planId, householdId } });
  if (!plan) throw new Error('FORBIDDEN');
  return plan;
}

export async function requireVisibleRecipe(recipeId: string, householdId: string) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, OR: [{ householdId: null }, { householdId }] },
  });
  if (!recipe) throw new Error('FORBIDDEN');
  return recipe;
}

export const visibleRecipeWhere = (householdId: string) => ({
  OR: [{ householdId: null }, { householdId }],
});
