import type { MealWithRecipe } from '@/lib/types';
import type { BatchColor } from '@/lib/utils/batchColors';
import { MEAL_TYPE_EMOJI } from '@/lib/utils/batchColors';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
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

  const kcal = recipe.kcalPerServing
    ? Math.round(recipe.kcalPerServing * meal.servings)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`panel-surface relative w-full h-full overflow-hidden rounded-[1.25rem] p-3 text-left ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all' : ''}`}
    >
      {color && (
        <div className={`absolute inset-x-0 top-0 h-1 ${color.dot}`} />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-[11px] sm:text-xs text-gray-500 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {MEAL_TYPE_EMOJI[meal.mealType] ?? '🍽'} {MEAL_LABELS[meal.mealType] ?? meal.mealType}
          </p>
          <p 
            className="text-[13px] sm:text-sm font-medium text-gray-900 leading-tight line-clamp-3 text-balance break-words hyphens-auto"
            title={recipe.name}
            lang="pl"
          >
            {recipe.name}
          </p>
        </div>

        {/* Batch day badge */}
        {batchGroupId && batchDayNum && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${color ? `${color.bg} ${color.border} ${color.text}` : 'bg-gray-100 border-border text-gray-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${color ? color.dot : 'bg-gray-300'}`} />
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
