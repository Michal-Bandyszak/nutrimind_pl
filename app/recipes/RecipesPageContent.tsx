import { prisma } from '@/lib/db/prisma';
import { visibleRecipeWhere } from '@/lib/access';
import type { RecipeListItem } from '@/lib/types';
import RecipesClient from './RecipesClient';

type Props = {
  householdId: string;
};

export default async function RecipesPageContent({ householdId }: Props) {
  const recipes = await prisma.recipe.findMany({
    where: visibleRecipeWhere(householdId),
    select: {
      id: true,
      name: true,
      type: true,
      role: true,
      source: true,
      variantKey: true,
      adjustmentNote: true,
      tags: true,
      ingredientBasis: true,
      baseServings: true,
      prepTimeMin: true,
      cookTimeMin: true,
      kcalPerServing: true,
      proteinG: true,
      carbsG: true,
      fatG: true,
      _count: {
        select: { mealPlanMeals: true },
      },
    },
    orderBy: { name: 'asc' },
  }) as RecipeListItem[];

  return <RecipesClient initialRecipes={recipes} />;
}
