import { getActivePlan } from '@/lib/services/MealPlanGenerator';
import { buildShoppingList } from '@/lib/services/ShoppingListBuilder';
import ShoppingClient from './ShoppingClient';
import { ShoppingCart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ShoppingPage() {
  const plan = await getActivePlan();

  if (!plan) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
          <div className="px-4 lg:px-6 py-4">
            <h1 className="text-lg font-semibold text-gray-900">Lista zakupów</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
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

  const shoppingList = await buildShoppingList(plan.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Lista zakupów</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {plan.name} · {shoppingList.totalItems} produktów
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6 py-5">
        <ShoppingClient list={shoppingList} />
      </div>
    </div>
  );
}
