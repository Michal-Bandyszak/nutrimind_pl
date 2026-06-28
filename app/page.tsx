import { Suspense } from 'react';
import { getActivePlanSummary } from '@/lib/services/MealPlanGenerator';
import GenerateButton from '@/components/plan/GenerateButton';
import PlanPageContent from '@/components/plan/PlanPageContent';
import { CalendarDays } from 'lucide-react';
import { requireAuthContext } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const context = await requireAuthContext();
  const plan = await getActivePlanSummary(context.householdId);
  const primary = plan?.participants.find((participant) => participant.isPrimarySnapshot);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Sticky header */}
      <div className="glass-header sticky top-0 z-30">
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
          <Suspense fallback={<PlanShellSkeleton summary={plan} />}>
            <PlanPageContent
              planId={plan.id}
              householdId={context.householdId}
              targetKcalPerPerson={primary?.targetKcalSnapshot ?? 2500}
            />
          </Suspense>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function PlanShellSkeleton({ summary }: { summary: NonNullable<Awaited<ReturnType<typeof getActivePlanSummary>>> }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="rounded-[1.5rem] border border-border bg-white/70 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {summary.participants.map((participant) => (
            <div
              key={participant.id}
              className="rounded-full bg-teal-50 px-3 py-1.5 text-xs text-teal-700"
            >
              {participant.nameSnapshot} · {participant.targetKcalSnapshot} kcal
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
          >
            <div className="h-3 w-20 rounded-full bg-gray-200" />
            <div className="mt-3 h-5 w-3/4 rounded-full bg-gray-200" />
            <div className="mt-4 space-y-2">
              <div className="h-10 rounded-2xl bg-gray-100" />
              <div className="h-10 rounded-2xl bg-gray-100" />
              <div className="h-10 rounded-2xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
