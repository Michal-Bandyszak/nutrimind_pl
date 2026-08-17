import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  currentPlanDayOfWeek,
  currentWeekStart,
  isValidDateKey,
  todayInAppTimeZone,
} from '../lib/utils/appDate';
import {
  chooseRecipeForGroup,
  NoEligibleRecipeError,
  recipeSelectionScore,
  type RecipeCandidate,
} from '../lib/utils/mealPlanScoring';
import { normalizeRecipeName } from '../lib/utils/recipeConstants';
import { inferRecipeSemantics } from '../lib/utils/recipeSemantics';
import { DEFAULT_BATCH_CONFIG, isBatchConfig, normalizeStoredBatchConfig } from '../lib/types';
import { isSuspiciousIngredientName, normalizeIngredientName } from '../lib/utils/ingredientNormalization';

const justAfterMidnightInWarsaw = new Date('2026-07-14T22:30:00.000Z');

assert.equal(todayInAppTimeZone(justAfterMidnightInWarsaw), '2026-07-15');
assert.equal(currentWeekStart(justAfterMidnightInWarsaw).toISOString(), '2026-07-13T00:00:00.000Z');
assert.equal(currentPlanDayOfWeek('2026-07-13T00:00:00.000Z', justAfterMidnightInWarsaw), 3);
assert.equal(isValidDateKey('2024-02-29'), true);
assert.equal(isValidDateKey('2026-02-29'), false);

console.log('Core date checks passed.');

assert.equal(
  normalizeRecipeName('  Chrupiąca  grzanka z pomidorową\u00a0salsą  '),
  'Chrupiąca grzanka z pomidorową salsą',
);
for (const fishName of ['Łosoś', 'Makrela wędzona', 'Filet śledziowy', 'Pstrąg mrożony', 'Mintaj mrożony']) {
  assert.ok(inferRecipeSemantics({ name: fishName }).proteins.includes('fish'), fishName);
}

const selectionOptions = {
  usedIds: new Set<string>(),
  requiredStorageDays: 1,
  targetKcalPerServing: 500,
};
const neutralCandidate: RecipeCandidate = {
  id: 'neutral',
  name: 'Neutralny przepis',
  maxStorageDays: 2,
  kcalPerServing: 500,
  tags: JSON.stringify(['low-carb']),
};
const balancedCandidate: RecipeCandidate = {
  ...neutralCandidate,
  id: 'balanced',
  name: 'Lokalny przepis',
  tags: JSON.stringify(['profil:srodziemnomorski', 'lokalne', 'budzetowe']),
};

assert.ok(
  recipeSelectionScore(balancedCandidate, selectionOptions)
    < recipeSelectionScore(neutralCandidate, selectionOptions),
);
assert.equal(Number.isFinite(recipeSelectionScore(neutralCandidate, selectionOptions)), true);

console.log('Balanced recipe preference checks passed.');

const selectionCandidate = (overrides: Partial<RecipeCandidate>): RecipeCandidate => ({
  id: 'candidate',
  name: 'Neutralny kandydat',
  role: 'meal',
  nutritionReady: true,
  maxStorageDays: 7,
  kcalPerServing: 500,
  batchFriendly: true,
  tags: '[]',
  ...overrides,
});

const lunchWithoutBatch = selectionCandidate({ id: 'lunch-1', batchFriendly: false });
assert.equal(
  chooseRecipeForGroup([lunchWithoutBatch], {
    ...selectionOptions,
    mealType: 'lunch',
    requiredStorageDays: 1,
    random: () => 0,
  }).id,
  'lunch-1',
);
assert.throws(
  () => chooseRecipeForGroup([lunchWithoutBatch], {
    ...selectionOptions,
    mealType: 'lunch',
    requiredStorageDays: 2,
  }),
  (error: unknown) => error instanceof NoEligibleRecipeError,
);

const rankedCandidates = Array.from({ length: 6 }, (_, index) => selectionCandidate({
  id: `rank-${index + 1}`,
  name: `Rank ${index + 1}`,
  kcalPerServing: 500 + index,
}));
const deterministicOptions = {
  ...selectionOptions,
  mealType: 'breakfast',
  random: () => 0.42,
};
const firstSelection = chooseRecipeForGroup(rankedCandidates, deterministicOptions);
const secondSelection = chooseRecipeForGroup(rankedCandidates, deterministicOptions);
assert.equal(firstSelection.id, secondSelection.id);
assert.notEqual(firstSelection.id, 'rank-6');

const familyCounts = new Map([['breakfast:eggs', 2]]);
assert.equal(
  chooseRecipeForGroup([
    selectionCandidate({ id: 'egg', name: 'Jajka ze szpinakiem' }),
    selectionCandidate({ id: 'salad', name: 'Sałatka z burakiem' }),
  ], {
    ...selectionOptions,
    mealType: 'breakfast',
    familyCounts,
    random: () => 0,
  }).id,
  'salad',
);
assert.equal(
  chooseRecipeForGroup([selectionCandidate({ id: 'egg', name: 'Jajka ze szpinakiem' })], {
    ...selectionOptions,
    mealType: 'breakfast',
    familyCounts,
    random: () => 0,
  }).id,
  'egg',
);

assert.equal(
  chooseRecipeForGroup([
    selectionCandidate({ id: 'previous', kcalPerServing: 500 }),
    selectionCandidate({ id: 'new', kcalPerServing: 500 }),
  ], {
    ...selectionOptions,
    mealType: 'breakfast',
    previousPlanRecipeIds: new Set(['previous']),
    random: () => 0,
  }).id,
  'new',
);
assert.throws(
  () => chooseRecipeForGroup([], {
    ...selectionOptions,
    mealType: 'dinner',
    requiredStorageDays: 3,
  }),
  (error: unknown) => error instanceof NoEligibleRecipeError,
);

console.log('Diverse safe selection checks passed.');

assert.equal(isBatchConfig(DEFAULT_BATCH_CONFIG), true);
assert.equal(isBatchConfig({ ...DEFAULT_BATCH_CONFIG, lunch: [false] }), false);
assert.equal(isBatchConfig({ ...DEFAULT_BATCH_CONFIG, extra: [false, false, false, false, false, false] }), false);
assert.deepEqual(
  normalizeStoredBatchConfig({ lunch: [true, false, true, false, true, false] }).lunch,
  [true, false, true, false, true, false],
);
assert.deepEqual(normalizeStoredBatchConfig({ lunch: [true] }).lunch, DEFAULT_BATCH_CONFIG.lunch);
console.log('Batch configuration checks passed.');

assert.equal(normalizeIngredientName('  ser   feta  '), 'Ser feta');
assert.equal(normalizeIngredientName('Odzywka biatkowa'), 'Odżywka białkowa');
assert.equal(isSuspiciousIngredientName('50g'), true);
assert.equal(isSuspiciousIngredientName('Pomidory, 200g'), true);
console.log('Ingredient normalization checks passed.');

type CuratedRecipe = {
  name: string;
  type: string;
  kcalPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  nutritionReady: boolean;
  tags: string[];
  ingredients: { name: string; amountG: number }[];
  instructions: string[];
};

const curatedPath = path.join(process.cwd(), 'data/curated/polish-balanced-recipes.json');
const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')) as { recipes: CuratedRecipe[] };
const curatedNames = new Set(curated.recipes.map((recipe) => recipe.name));

assert.equal(curated.recipes.length, 14);
assert.equal(curatedNames.size, curated.recipes.length);
assert.equal(curated.recipes.filter((recipe) => recipe.type === 'breakfast').length, 3);
assert.equal(curated.recipes.filter((recipe) => recipe.type === 'second_breakfast').length, 3);
assert.equal(curated.recipes.filter((recipe) => recipe.type === 'lunch').length, 4);
assert.equal(curated.recipes.filter((recipe) => recipe.type === 'dinner').length, 4);

for (const recipe of curated.recipes) {
  assert.equal(recipe.nutritionReady, true, `${recipe.name}: nutritionReady`);
  assert.ok(recipe.tags.includes('profil:srodziemnomorski'), `${recipe.name}: profil tag`);
  assert.ok(recipe.tags.includes('lokalne'), `${recipe.name}: local tag`);
  assert.ok(recipe.ingredients.length >= 5, `${recipe.name}: ingredients`);
  assert.ok(recipe.ingredients.every((ingredient) => ingredient.amountG > 0), `${recipe.name}: amounts`);
  assert.ok(recipe.instructions.length >= 2, `${recipe.name}: instructions`);
  assert.ok(recipe.fiberG > 0, `${recipe.name}: fiber`);

  const kcalFromMacros = recipe.proteinG * 4 + recipe.carbsG * 4 + recipe.fatG * 9;
  const relativeDifference = Math.abs(kcalFromMacros - recipe.kcalPerServing) / recipe.kcalPerServing;
  assert.ok(relativeDifference <= 0.1, `${recipe.name}: kcal and macros differ by more than 10%`);
}

console.log('Polish curated recipe checks passed.');
