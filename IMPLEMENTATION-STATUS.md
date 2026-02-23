# Implementation Status

> Last updated: 2026-02-22

---

## ✅ Done

### Project Setup
- [x] Next.js 16 + TypeScript initialized (manual setup, not create-next-app due to existing files)
- [x] Tailwind CSS v4 configured (`@tailwindcss/postcss` plugin, CSS-based config)
- [x] Prisma v5 with SQLite configured (`prisma/schema.prisma`, `prisma/dev.db`)
- [x] All scripts in `package.json` (`dev`, `build`, `db:seed`, `db:reset`, `db:studio`, `parse:diets`)
- [x] `.env` with `DATABASE_URL="file:./dev.db"`
- [x] `.gitignore` (excludes `node_modules`, `.next`, `prisma/dev.db`, diet files)

### Database Schema (`prisma/schema.prisma`)

| Model | Fields | Notes |
|---|---|---|
| `Ingredient` | name, category, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, packageSizeG, packageUnit, packageLabel | packageSize fields enable waste-prevention feature |
| `Recipe` | name, type, prepTimeMin, cookTimeMin, batchFriendly, maxStorageDays, kcalPerServing, proteinG, carbsG, fatG, fiberG, instructions (JSON), sourceDiet | |
| `RecipeIngredient` | recipeId, ingredientId, amountG, displayText, scalesLinearly | scalesLinearly=false for oils/spices |
| `MealPlan` | name, weekStart, status (draft/active/archived) | |
| `MealPlanMeal` | mealPlanId, dayOfWeek (1-7), mealType, recipeId, servings, batchGroupId, batchDayNum | batchGroupId groups meals cooked together |

### Diet Parser (`scripts/parse-diets.ts`)

Reads Polish dietitian `.md` files and extracts:
- Recipe names (handles multi-line names in code blocks and bold headers)
- Ingredients with exact gram amounts and display text
- Per-meal macros (kcal, protein, carbs, fat, fiber)
- Batch-friendliness heuristics (soups/stews = true, omelettes/salads = false)
- Max storage days per recipe type
- Ingredient categories (vegetables, fruits, grains, protein, dairy, oils, spices, nuts)
- Substitution rules from diet headers (diet 2 has 12 rules)

Outputs: `data/parsed/<diet-name>.json` + `data/parsed/combined.json`

**Supported diet format:** Sylwester Kłos dietitian format with `### Meal Kcal: X` headings and code block ingredients.

### Database Seeding (`prisma/seed.ts`)

- Upserts ingredients (deduplicates by name across diets)
- Upserts recipes (deduplicates by name + sourceDiet)
- Creates `RecipeIngredient` links with `scalesLinearly` flag
- Injects known package sizes (coconut milk can = 400ml, etc.) for waste prevention
- **Safe to run multiple times** — will update existing, not duplicate

### Current Data in Database

| Metric | Count |
|---|---|
| Total unique recipes | **58** |
| Total ingredient links | **473** |
| From "Plan bazowy A" (2800 kcal) | 28 recipes |
| From "Plan bazowy B" (2500 kcal) | 32 recipes |

**Recipe types:**
- `breakfast` — 11 recipes
- `lunch` — 26 recipes (includes side salads)
- `dinner` — 13 recipes
- `cocktail` — 4 recipes (morning + post-workout)
- `snack` — 4 recipes

**Batch-friendly:** ~15 recipes flagged as batch-friendly (soups, curries, risottos, bowls, pasta dishes, overnight oats)

**Max storage days assigned:**
- Fish dishes → 2 days
- Chicken/turkey → 3 days
- Soups, curries, risottos → 4 days
- Pasta, grains → 3 days
- Cocktails → 1 day

**Known package sizes on ingredients:**
- Mleczko kokosowe → 400ml can
- Napój kokosowy → 1L carton
- Passata → 700g bottle
- Jogurt kokosowy → 125g pot
- Bulion warzywny → 500ml carton
- (+ others)

---

## 🔲 Not Yet Built

### App Shell
- [ ] `app/layout.tsx` — root layout with navigation
- [ ] `app/globals.css` — Tailwind v4 import + base styles
- [ ] `lib/db/prisma.ts` — Prisma client singleton

### Pages
- [ ] `/` (`app/page.tsx`) — week plan view (main screen)
- [ ] `/plan/generate` — generate new meal plan
- [ ] `/recipes` — recipe browser with filters
- [ ] `/recipes/[id]` — recipe detail with portion scaling slider
- [ ] `/shopping` — shopping list by category + package waste warnings
- [ ] `/settings` — calorie targets, cooking days config

### API Routes
- [ ] `GET /api/recipes` — list recipes with filters
- [ ] `GET /api/recipes/[id]` — single recipe
- [ ] `POST /api/meal-plans` — create meal plan
- [ ] `GET /api/meal-plans/active` — get active plan
- [ ] `GET /api/shopping/[planId]` — generate shopping list from plan

### Services (`lib/services/`)
- [ ] `MealPlanGenerator.ts` — picks recipes, groups batch cooking, assigns days
- [ ] `ShoppingListBuilder.ts` — aggregates ingredients, groups by category, flags package waste
- [ ] `WasteOptimizer.ts` — finds recipe pairings that share partial packages (e.g. coconut milk)
- [ ] `NutritionCalculator.ts` — per-serving and per-batch macro totals

### UI Components
- [ ] `WeekGrid` — 7-day × meal-type grid with batch color coding
- [ ] `MealCard` — single meal slot with batch day badge
- [ ] `ShoppingList` — grouped by category, package units shown
- [ ] `RecipeCard` — recipe summary card
- [ ] `Navigation` — bottom bar (mobile) + sidebar (desktop)

### Infrastructure
- [ ] PWA config (`next-pwa`) — installable on phone
- [ ] Vercel deployment

---

## Known Issues / Notes

- Side salads ("Surówka...") are parsed as standalone recipes with the same kcal as the main dish they accompany — kcal is shared across the whole meal section, not split. This is acceptable for MVP.
- Ingredient nutritional data per 100g (kcalPer100g etc.) is not yet populated — it's in the schema but not in the seed. Macros are stored per-serving on the Recipe model, which is what matters for meal planning.
- "Stek wołowy" appears in both diets with slightly different ingredients — the combined.json keeps the first version found (from diet 1).
- Diet 2's substitution rules (12 rules about oil swaps, grain equivalents, etc.) are extracted and saved to `data/parsed/combined.json` but not yet loaded into the DB — no DB model for substitution rules yet.
