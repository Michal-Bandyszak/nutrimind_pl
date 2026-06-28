import { Suspense } from 'react';
import { prisma } from '@/lib/db/prisma';
import {
  isRecipe2500Variant,
  type RecipeBrowserMeta,
} from '@/lib/utils/recipeConstants';
import RecipesPageContent from './RecipesPageContent';
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
  const where = visibleRecipeWhere(context.householdId);
  const [recipeCount, recipeVariants] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      select: { variantKey: true },
    }),
  ]);

  const recipeSummary = recipeVariants.reduce(
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
            {recipeCount} przepisów w bazie
            {summaryParts.length > 0 ? ` · ${summaryParts.join(' · ')}` : ''}
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6 py-5">
        <Suspense fallback={<RecipesShellSkeleton />}>
          <RecipesPageContent householdId={context.householdId} />
        </Suspense>
      </div>
    </div>
  );
}

function RecipesShellSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-11 rounded-2xl bg-white/70 shadow-sm ring-1 ring-border" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-8 w-24 rounded-full bg-gray-200" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
        >
          <div className="h-4 w-24 rounded-full bg-gray-200" />
          <div className="mt-3 h-5 w-3/4 rounded-full bg-gray-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-4 w-16 rounded-full bg-gray-100" />
            <div className="h-4 w-16 rounded-full bg-gray-100" />
            <div className="h-4 w-16 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
