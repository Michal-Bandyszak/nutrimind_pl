import { prisma } from '@/lib/db/prisma';
import {
  isRecipe2500Variant,
  type RecipeBrowserMeta,
} from '@/lib/utils/recipeConstants';
import RecipesClient from './RecipesClient';
import { requireAuthContext } from '@/lib/auth-context';
import { visibleRecipeWhere } from '@/lib/access';

export const dynamic = 'force-dynamic';

function pluralizePl(count: number, one: string, few: string, many: string) {
  if (count === 1) return `${count} ${one}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

export default async function RecipesPage() {
  const context = await requireAuthContext();
  const recipes = await prisma.recipe.findMany({
    where: visibleRecipeWhere(context.householdId),
    include: {
      ingredients: { include: { ingredient: true } },
      _count: { select: { mealPlanMeals: true } },
    },
    orderBy: { name: 'asc' },
  });

  const recipeSummary = recipes.reduce(
    (acc, recipe) => {
      const recipeMeta = recipe as RecipeBrowserMeta;
      if (isRecipe2500Variant(recipeMeta)) acc.variants2500 += 1;
      return acc;
    },
    { variants2500: 0 },
  );

  const summaryParts = [
    recipeSummary.variants2500 > 0 ? pluralizePl(recipeSummary.variants2500, 'wariant 2500', 'warianty 2500', 'wariantów 2500') : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="glass-header sticky top-0 z-30">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Przepisy</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {recipes.length} przepisów w bazie
            {summaryParts.length > 0 ? ` · ${summaryParts.join(' · ')}` : ''}
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6 py-5">
        <RecipesClient recipes={recipes} />
      </div>
    </div>
  );
}
