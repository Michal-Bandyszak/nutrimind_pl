import { prisma } from '@/lib/db/prisma';
import RecipesClient from './RecipesClient';

export const dynamic = 'force-dynamic';

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: { include: { ingredient: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Przepisy</h1>
          <p className="text-xs text-gray-400 mt-0.5">{recipes.length} przepisów w bazie</p>
        </div>
      </div>
      <div className="px-4 lg:px-6 py-5">
        <RecipesClient recipes={recipes} />
      </div>
    </div>
  );
}
