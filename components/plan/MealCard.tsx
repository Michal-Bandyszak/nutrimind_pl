import type { MealWithRecipe } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
  cocktail: 'Koktajl',
};

type Props = {
  meal: MealWithRecipe;
  color: BatchColor | null;
  onClick?: () => void;
};

export default function MealCard({ meal, color, onClick }: Props) {
  const { recipe, batchDayNum, batchGroupId } = meal;

  const colorClasses = color
    ? `${color.bg} ${color.border}`
    : 'bg-gray-50 border-gray-200';

  const kcal = recipe.kcalPerServing
    ? Math.round(recipe.kcalPerServing * meal.servings)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-full text-left border rounded-xl p-3 ${colorClasses} ${onClick ? 'cursor-pointer hover:brightness-95 active:scale-[0.98] transition-all' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">
            {MEAL_TYPE_EMOJI[meal.mealType] ?? '🍽'} {MEAL_LABELS[meal.mealType] ?? meal.mealType}
          </p>
          <p className="text-sm font-medium text-gray-900 leading-snug">
            {recipe.name}
          </p>
        </div>

        {/* Batch day badge */}
        {batchGroupId && batchDayNum && (
          <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-md ${color ? `${color.bg} ${color.text}` : 'bg-gray-100 text-gray-500'}`}>
            {batchDayNum}
          </span>
        )}
      </div>

      {/* Macros */}
      {kcal && (
        <p className="mt-1.5 text-xs text-gray-400">{kcal} kcal</p>
      )}
    </button>
  );
}
