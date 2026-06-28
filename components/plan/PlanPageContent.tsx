import { CalendarDays } from 'lucide-react';
import { fetchPlanWithMeals } from '@/lib/services/MealPlanGenerator';
import PlanView from './PlanView';

type Props = {
  planId: string;
  householdId: string;
  targetKcalPerPerson: number;
};

export default async function PlanPageContent({ planId, householdId, targetKcalPerPerson }: Props) {
  try {
    const plan = await fetchPlanWithMeals(planId, householdId);
    return <PlanView key={plan.id} plan={plan} targetKcalPerPerson={targetKcalPerPerson} />;
  } catch {
    return <EmptyState />;
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-teal-50 shadow-sm ring-1 ring-teal-100">
        <CalendarDays size={28} className="text-teal-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Brak aktywnego planu</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Naciśnij &ldquo;Nowy plan&rdquo; żeby wygenerować tygodniowy jadłospis z gotowaniem wsadowym.
      </p>
    </div>
  );
}
