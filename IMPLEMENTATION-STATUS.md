# Implementation Status

> Last updated: 2026-02-23

---

## ✅ Phase 1 — Completed

### Project Setup
- [x] Next.js 16 + TypeScript
- [x] Tailwind CSS v4 (`@tailwindcss/postcss` plugin, CSS-based config with `@theme` tokens)
- [x] Prisma v5 with SQLite (`prisma/schema.prisma`, `prisma/dev.db`)
- [x] All scripts in `package.json` (`dev`, `build`, `db:seed`, `db:reset`, `db:studio`, `parse:diets`)
- [x] `.gitignore` (excludes `node_modules`, `.next`, `prisma/dev.db`, personal diet files)
- [x] Git initialized, 11 logical commits

### Database Schema (`prisma/schema.prisma`)

| Model | Key Fields | Notes |
|---|---|---|
| `Ingredient` | name, category, kcalPer100g, macros, packageSizeG, packageUnit, packageLabel | packageSize fields enable waste-prevention |
| `Recipe` | name, type, prepTimeMin, cookTimeMin, batchFriendly, maxStorageDays, kcalPerServing, macros, instructions (JSON), sourceDiet | |
| `RecipeIngredient` | recipeId, ingredientId, amountG, displayText, scalesLinearly | scalesLinearly=false for oils/spices |
| `MealPlan` | name, weekStart, status (draft/active/archived) | |
| `MealPlanMeal` | mealPlanId, dayOfWeek (1-7), mealType, recipeId, servings, batchGroupId, batchDayNum | batchGroupId groups meals cooked together |

> Note: No Household/User model — single-user MVP, no auth needed.

### Diet Parser (`scripts/parse-diets.ts`)

Reads Polish dietitian `.md` files and extracts:
- Recipe names, ingredients with gram amounts and display text
- Per-meal macros (kcal, protein, carbs, fat, fiber)
- Batch-friendliness heuristics (soups/stews = true, omelettes/salads = false)
- Max storage days per recipe type
- Ingredient categories
- Substitution rules from diet headers (diet 2 has 12 rules)

Outputs: `data/parsed/<diet-name>.json` + `data/parsed/combined.json`

### Database Content

| Metric | Count |
|---|---|
| Total unique recipes | **58** |
| Total ingredient links | **473** |
| From "Plan bazowy A" (2800 kcal) | 28 recipes |
| From "Plan bazowy B" (2500 kcal) | 32 recipes |

**Recipe types:** breakfast (11), lunch (26), dinner (13), cocktail (4), snack (4)
**Batch-friendly:** ~15 recipes (soups, curries, risottos, bowls, pasta, overnight oats)

### App Shell & Design System
- [x] `app/layout.tsx` — root layout with Navigation
- [x] `app/globals.css` — Tailwind v4 + `@theme` with `--color-surface`, `--color-card`, `--color-border`
- [x] `lib/db/prisma.ts` — Prisma client singleton
- [x] Design: Mediterranean-Apple minimal. Primary: teal-700. Accent: amber. Font: Inter.
- [x] Desktop: fixed left sidebar (256px) + main content
- [x] Mobile: bottom nav bar (64px) + `pb-20` on main

### Navigation
- [x] `components/nav/Navigation.tsx` — client component, `usePathname`, renders both desktop + mobile nav

### Meal Plan — Week View (`/`)
- [x] `app/page.tsx` — main screen, server component
- [x] `components/plan/WeekGrid.tsx` — 7-column grid desktop / vertical list mobile
- [x] `components/plan/MealCard.tsx` — recipe name, macros, batch day badge (color coded)
- [x] `components/plan/PlanView.tsx` — client wrapper, manages drag state + optimistic swap + API call
- [x] `lib/utils/batchColors.ts` — `buildBatchColorMap()`, 6 colors: teal, amber, sky, rose, violet, orange
- [x] Drag & drop meal swapping — HTML5 DnD, swaps entire batch groups

### Meal Plan — Generation & Config
- [x] `components/plan/GenerateButton.tsx` — POST to `/api/meal-plans/generate`, gear icon opens BatchConfigPanel
- [x] `components/plan/BatchConfigPanel.tsx` — clickable divider gaps between day pills; thick line = break
- [x] `components/plan/RecipeModal.tsx` — click meal card → recipe details overlay
- [x] `lib/utils/planUtils.ts` — `dividersToGroups()`, `DEFAULT_BATCH_CONFIG`

### Services
- [x] `lib/services/MealPlanGenerator.ts` — picks recipes, groups batch cooking, assigns days, validates kcal ±10%
- [x] `lib/services/ShoppingListBuilder.ts` — aggregates ingredients, groups by category, package waste warnings

### API Routes
- [x] `POST /api/meal-plans/generate` — create new meal plan (accepts BatchConfig in body)
- [x] `GET /api/meal-plans/active` — fetch active plan with all meals + recipe data
- [x] `PATCH /api/meal-plans/[planId]/swap` — swap recipe across entire batch group
- [x] `POST /api/meal-plans/[planId]/rebatch` — recalculate batch groups with new config
- [x] `GET /api/recipes` — list recipes with type filter
- [x] `GET /api/shopping/[planId]` — generate shopping list from active plan

### Recipe Browser (`/recipes`)
- [x] `app/recipes/page.tsx` — server component
- [x] `app/recipes/RecipesClient.tsx` — search + type filter, expandable recipe cards

### Shopping List (`/shopping`)
- [x] `app/shopping/page.tsx` — server component
- [x] `app/shopping/ShoppingClient.tsx` — checkbox state, progress bar, package waste warnings
- [x] Groups by category: Warzywa, Owoce, Białko, Nabiał, Zboża, Oleje, Przyprawy, Inne
- [x] Package info: "3× kubek 125g", waste warnings: "zostanie ~500g"

---

## 🔲 Phase 1 — Remaining

### Nice-to-have for complete Phase 1
- [ ] `/recipes/[id]` — recipe detail page with portion scaling slider
- [ ] `/settings` — calorie targets (Person A / B), cooking days config (currently hardcoded)

### Infrastructure
- [ ] PWA config (`next-pwa`) — installable on phone, offline cache
- [ ] Vercel deployment + custom domain — needed for mobile access

---

## 🔲 Phase 2 — Not Yet Started

### AI Integration
- [ ] `POST /api/ai/generate-plan` — Claude API meal plan generation (better than deterministic)
- [ ] `POST /api/ai/substitute` — ingredient substitution via Claude + DB rules
- [ ] `/chat` page + `GET/POST /api/ai/chat` — AI diet assistant with streaming

### Health Tracking
- [ ] `/tracking` page — daily log: mood (emoji), energy (1-5), sleep, weight, water
- [ ] `POST /api/health-log` — save daily entry
- [ ] `/dashboard` — Recharts: weight trend, macro chart, Mediterranean Score, sleep+energy correlation

### Mediterranean Diet Score
- [ ] `lib/services/MediterraneanScorer.ts` — score meal plans 0-14
- [ ] Display score per plan in UI

### Dual-person Scaling
- [ ] Toggle: view portions for Person A / Person B / both
- [ ] `lib/services/ScalingEngine.ts` — 5 scaling types (linear, sqrt, log, fixed, custom)

---

## 🔲 Phase 3 — Future

- [ ] Morning/evening routines with timers and streak tracking
- [ ] 30-day dopamine detox tracker
- [ ] AI coaching: personalized weekly suggestions based on health log
- [ ] PDF export of meal plan + shopping list
- [ ] Share meal plan via link (read-only)

---

## 🔲 Phase 4 — Future

- [ ] USDA FoodData Central integration for ingredient enrichment
- [ ] Barcode scanner (in-store product lookup)
- [ ] Cooking timeline with parallel task optimization (Gantt chart)
- [ ] Lighthouse score > 90
- [ ] Onboarding tour

---

## Known Issues / Notes

- Side salads ("Surówka...") are parsed as standalone recipes with the same kcal as the main dish — kcal is shared across the whole section, not split. Acceptable for MVP.
- Ingredient nutritional data per 100g (`kcalPer100g` etc.) is in the schema but not populated in seed. Macros are stored per-serving on `Recipe`, which is sufficient for meal planning.
- "Stek wołowy" appears in both diets — `combined.json` keeps the first version (from diet 1).
- Diet 2's 12 substitution rules are in `combined.json` but not yet loaded into the DB (no `IngredientSubstitute` model yet).
- Calorie targets and cooking days are currently hardcoded in `MealPlanGenerator.ts` — a `/settings` page would expose these.
