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

const recoveredPath = path.join(process.cwd(), 'data/curated/recovered-production-recipes.json');
const recoveredText = fs.readFileSync(recoveredPath, 'utf8');
const recovered = JSON.parse(recoveredText) as { description: string; sourceDiet: string; recipes: Recipe[] };
const forbiddenSourceLabels = /NutriMind katalog bazowy|dopaminowa klasyczna|dieta low carb low food|dieta 1800 kcal|recovered production export/i;

assert.equal(recovered.recipes.length, 77, 'Sanitized catalog should contain 77 recipes');
assert.equal(recovered.sourceDiet, 'NutriMind katalog bazowy', 'Sanitized catalog source');
assert.ok(!forbiddenSourceLabels.test(recoveredText), 'Sanitized catalog contains a legacy source label');
assert.equal(new Set(recovered.recipes.map((recipe) => recipe.name)).size, recovered.recipes.length, 'Recovered names must be unique');
assert.ok(recovered.recipes.every((recipe) => recipe.sourceDiet === 'NutriMind katalog bazowy'));
assert.ok(!/("(?:id|householdId|userId|sessionId|createdAt|updatedAt|localPath)")/i.test(recoveredText));

console.log(`Sanitized recovered catalog checks passed (${recovered.recipes.length} recipes).`);
