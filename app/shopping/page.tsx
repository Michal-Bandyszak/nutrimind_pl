import { Suspense } from 'react';
import { getActivePlanSummary } from '@/lib/services/MealPlanGenerator';
import ShoppingPageContent from './ShoppingPageContent';
import { ShoppingCart } from 'lucide-react';
import { requireAuthContext } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

export default async function ShoppingPage() {
  const context = await requireAuthContext();
  const plan = await getActivePlanSummary(context.householdId);

  if (!plan) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="glass-header sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-4">
            <h1 className="text-lg font-semibold text-gray-900">Lista zakupów</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-teal-50 shadow-sm ring-1 ring-teal-100">
            <ShoppingCart size={28} className="text-teal-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Brak aktywnego planu</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Najpierw wygeneruj plan tygodnia — lista zakupów pojawi się automatycznie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-header sticky top-0 z-30">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Lista zakupów</h1>
          <p className="text-xs text-gray-400 mt-0.5">{plan.name}</p>
        </div>
      </div>
      <div className="px-4 lg:px-6 py-5">
        <Suspense fallback={<ShoppingShellSkeleton />}>
          <ShoppingPageContent planId={plan.id} householdId={context.householdId} />
        </Suspense>
      </div>
    </div>
  );
}

function ShoppingShellSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[1.5rem] border border-border bg-white/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-24 rounded-full bg-gray-200" />
          <div className="h-3 w-20 rounded-full bg-gray-100" />
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-100" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <div className="mb-2 h-4 w-28 rounded-full bg-gray-200" />
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-white/70">
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="h-4 w-32 rounded-full bg-gray-200" />
                <div className="h-4 w-16 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
