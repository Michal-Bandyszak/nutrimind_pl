import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  currentPlanDayOfWeek,
  currentWeekStart,
  isValidDateKey,
  todayInAppTimeZone,
} from '../lib/utils/appDate';
import { recipeSelectionScore, type RecipeCandidate } from '../lib/utils/mealPlanScoring';
import { normalizeRecipeName } from '../lib/utils/recipeConstants';
import { inferRecipeSemantics } from '../lib/utils/recipeSemantics';

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

type CuratedRecipe = {
  name: string;
  type: string;
  kcalPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  nutritionVerified: boolean;
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
  assert.equal(recipe.nutritionVerified, true, `${recipe.name}: nutritionVerified`);
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
