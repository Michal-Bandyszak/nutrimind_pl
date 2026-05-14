export { MEAL_TYPE_LABELS, MEAL_TYPE_EMOJI } from './batchColors';

export const VALID_TYPES = [
  'breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert',
] as const;

export const TYPE_COLORS: Record<string, string> = {
  breakfast:        'bg-amber-100 text-amber-700',
  second_breakfast: 'bg-orange-100 text-orange-700',
  lunch:            'bg-teal-100 text-teal-700',
  dinner:           'bg-blue-100 text-blue-700',
  snack:            'bg-rose-100 text-rose-700',
  cocktail:         'bg-violet-100 text-violet-700',
  dessert:          'bg-pink-100 text-pink-700',
};

export const TYPE_FILTERS = [
  { value: 'all',              label: 'Wszystkie' },
  { value: 'favorites',        label: '\u2605 Ulubione' },
  { value: 'breakfast',        label: 'Śniadania' },
  { value: 'second_breakfast', label: 'Drugie śniadanie' },
  { value: 'lunch',            label: 'Obiady' },
  { value: 'dinner',           label: 'Kolacje' },
  { value: 'snack',            label: 'Przekąski' },
  { value: 'cocktail',         label: 'Koktajle' },
  { value: 'soup',             label: 'Zupy' },
  { value: 'dessert',          label: 'Ciasta i desery' },
];

/** TYPE_FILTERS without favorites/soup — for recipe picker modals */
export const TYPE_FILTERS_BASIC = TYPE_FILTERS.filter(
  (f) => f.value !== 'favorites' && f.value !== 'soup',
);

export const CATEGORIES = [
  'vegetables', 'fruits', 'grains', 'protein',
  'dairy', 'oils', 'nuts', 'spices', 'other',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  vegetables: 'Warzywa', fruits: 'Owoce', grains: 'Zboża',
  protein: 'Białko', dairy: 'Nabiał', oils: 'Oleje',
  nuts: 'Orzechy', spices: 'Przyprawy', other: 'Inne',
};
