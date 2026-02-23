# NutriMind

AI-powered meal planning with batch cooking optimization and waste-aware shopping lists.

---

## Quick Start (localhost)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

The `.env` file is already created with SQLite config:

```
DATABASE_URL="file:./dev.db"
```

> When you add the Anthropic API key for AI features later, add it here:
> `ANTHROPIC_API_KEY="sk-ant-..."`

### 3. The database is already seeded

The SQLite database (`prisma/dev.db`) is pre-seeded with 58 recipes from two diet files. If it's missing or you want to reset it:

```bash
# Option A: Full reset (drops everything, re-migrates, re-seeds)
npm run db:reset

# Option B: Just re-seed (schema already exists)
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

App runs at **http://localhost:3000**

---

## Adding a New Diet

When you have a new diet file (`.md` format from the dietitian), drop it in the root directory and add its filename to `scripts/parse-diets.ts`:

```typescript
const DIET_FILES = [
  "Plan bazowy A.md",
  "Plan bazowy B.md",
  "nowa-dieta.md",   // ← add here
];
```

Then run:

```bash
npm run parse:diets   # extracts recipes → data/parsed/
npm run db:seed       # upserts into database (safe to run multiple times)
```

---

## Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server on :3000 |
| `npm run build` | Production build |
| `npm run parse:diets` | Parse diet .md files → `data/parsed/combined.json` |
| `npm run db:seed` | Seed database from parsed diets (idempotent) |
| `npm run db:reset` | Full wipe + re-migrate + re-seed |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) at :5555 |
| `npm run db:migrate` | Run schema migrations after changing `prisma/schema.prisma` |

---

## Database Browser

To inspect the database visually:

```bash
npm run db:studio
```

Opens at http://localhost:5555 — you can browse all recipes, ingredients, meal plans.

---

## Project Structure

```
nutrimind/
├── app/                  # Next.js App Router pages (to be built)
│   └── api/              # API routes (to be built)
├── components/           # React components (to be built)
│   └── ui/               # shadcn/ui components (to be added)
├── lib/
│   └── services/         # Business logic (to be built)
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Seeder script
│   ├── dev.db            # SQLite database (git-ignored)
│   └── migrations/       # Migration history
├── scripts/
│   └── parse-diets.ts    # Diet .md → JSON parser
├── data/
│   └── parsed/           # Parsed recipe JSON files
├── .env                  # Local environment variables (git-ignored)
├── next.config.ts
├── postcss.config.js     # Tailwind v4 PostCSS config
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| Database | SQLite (Prisma v5) |
| AI | Claude API — Anthropic SDK (Phase 2) |
| Deploy | Vercel |

---

## Database Schema (current)

```
Ingredient       — name, category, kcal/100g macros, package size for waste tracking
Recipe           — name, type, macros/serving, batch-friendly flag, max storage days
RecipeIngredient — links Recipe ↔ Ingredient with gram amounts
MealPlan         — a weekly plan (draft/active/archived)
MealPlanMeal     — one meal slot in a plan (day, type, recipe, servings, batchGroupId)
```

---

## Phase 2 Setup (future)

When adding Claude AI features, install the Anthropic SDK:

```bash
npm install @anthropic-ai/sdk
```

Add to `.env`:
```
ANTHROPIC_API_KEY="sk-ant-..."
```
