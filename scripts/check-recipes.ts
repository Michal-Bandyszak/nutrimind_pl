import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

type Recipe = {
  name: string;
  type: string;
  source: string;
  sourceDiet: string;
  adjustmentNote?: string;
  kcalPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  maxStorageDays: number;
  ingredients: Array<{ name: string; amountG: number }>;
  instructions: string[];
};

const filePath = path.join(process.cwd(), 'data/curated/rozkoszny-recipes.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { recipes: Recipe[] };
const recipes = data.recipes;

assert.equal(recipes.length, 16, 'Rozkoszny set should contain 16 recipes');
assert.equal(new Set(recipes.map((recipe) => recipe.name)).size, recipes.length, 'Recipe names must be unique');
assert.deepEqual(
  Object.fromEntries(
    ['breakfast', 'lunch', 'dinner', 'dessert'].map((type) => [
      type,
      recipes.filter((recipe) => recipe.type === type).length,
    ]),
  ),
  { breakfast: 4, lunch: 4, dinner: 4, dessert: 4 },
);

for (const recipe of recipes) {
  assert.equal(recipe.source, 'curated', `${recipe.name}: source`);
  assert.equal(recipe.sourceDiet, 'Rozkoszny', `${recipe.name}: sourceDiet`);
  assert.match(recipe.adjustmentNote ?? '', /rozkoszny\.pl\//i, `${recipe.name}: source URL`);
  assert.ok(recipe.maxStorageDays >= 1, `${recipe.name}: storage`);
  assert.ok(recipe.ingredients.length >= 5, `${recipe.name}: ingredients`);
  assert.ok(recipe.ingredients.every((ingredient) => ingredient.amountG > 0), `${recipe.name}: amounts`);
  assert.ok(recipe.instructions.length >= 2, `${recipe.name}: instructions`);
  assert.ok(recipe.fiberG > 0, `${recipe.name}: fiber`);
  const macroKcal = recipe.proteinG * 4 + recipe.carbsG * 4 + recipe.fatG * 9;
  const relativeDifference = Math.abs(macroKcal - recipe.kcalPerServing) / recipe.kcalPerServing;
  assert.ok(relativeDifference <= 0.1, `${recipe.name}: macro kcal mismatch`);
}

console.log(`Rozkoszny recipe checks passed (${recipes.length} recipes).`);
