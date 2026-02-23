import { getActivePlan } from '@/lib/services/MealPlanGenerator';
import PlanView from '@/components/plan/PlanView';
import GenerateButton from '@/components/plan/GenerateButton';
import { CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const plan = await getActivePlan();

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-start justify-between gap-4 px-4 lg:px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Plan tygodnia</h1>
            {plan && <p className="text-xs text-gray-400 mt-0.5">{plan.name}</p>}
          </div>
          <GenerateButton />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6 py-5">
        {plan ? (
          <PlanView key={plan.id} plan={plan} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
        <CalendarDays size={28} className="text-teal-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Brak aktywnego planu</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Naciśnij &ldquo;Nowy plan&rdquo; żeby wygenerować tygodniowy jadłospis z gotowaniem wsadowym.
      </p>
    </div>
  );
}
