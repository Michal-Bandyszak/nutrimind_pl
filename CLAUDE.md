# NutriMind — Development Guide

## Quick Start (Phase 1 Setup)

```bash
# 1. Initialize Next.js project
npx create-next-app@latest nutrimind --typescript --tailwind --app

# 2. Initialize Prisma with SQLite
cd nutrimind
npm install @prisma/client prisma
npx prisma init

# 3. Configure .env
# DATABASE_URL="file:./prisma/dev.db"

# 4. Create Prisma schema
# (Copy schema from NUTRIMIND-IMPLEMENTATION-PLAN.md, section 3)
# npx prisma migrate dev --name init

# 5. Install additional dependencies
npm install @supabase/supabase-js shadcn-ui anthropic recharts next-pwa

# 6. You're ready to build!
```

That's it. No Supabase setup needed for MVP. Just local SQLite development.

---

## Project Overview

**NutriMind Mediterranean** is an AI-powered health & diet assistant with Mediterranean diet profile, batch cooking optimization, and portion scaling for 2 people.

**Core Problem:** Importing diets from PDFs, meal planning, portion calculations, shopping lists, and batch cooking coordination is tedious manual work.

**Solution:** Single application that imports diet PDFs as recipe base, generates weekly balanced meal plans, optimizes for batch cooking (cook 2×/week, eat all week), auto-scales portions for 2 people with different caloric goals, and generates shopping lists & cooking schedules.

**Users:** Initial: Michał + partner. Future: anyone wanting healthy eating without daily planning.

---

## Tech Stack

### Phase 1 (MVP) — Lightweight
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | **Next.js 14+ (App Router)** | SSR, API routes in one repo |
| Language | **TypeScript** | Type safety for nutritional calculations |
| UI | **Tailwind CSS + shadcn/ui** | Fast dev, mobile-first, consistent design system |
| Database | **SQLite** | Zero setup, fast local dev, perfect for MVP |
| ORM | **Prisma** | Type-safe queries, migrations, auto-generated types |
| AI | **Claude API (Anthropic)** | Meal plan generation, substitutions, coaching |
| Mobile | **PWA (next-pwa)** | One codebase = web + phone app |
| Deploy | **Vercel OR Your VPS** | See deployment options below |
| Charts | **Recharts** | Macro visualization, weight trends, Mediterranean Score |

### Phase 2+ — Scale to Multi-User
When you need multi-user support (partner account, RLS, real-time sync):
- Migrate database to **Supabase (PostgreSQL)**
- Add Supabase Auth
- Implement Row-Level Security (RLS) per household
- Real-time subscriptions for shared lists

**Migration is straightforward:** Prisma works with both SQLite and PostgreSQL. Just update `.env` connection string and run Prisma migrations on Supabase.

---

## Project Structure

```
nutrimind/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register, onboarding)
│   ├── (app)/                    # Protected app pages
│   │   ├── dashboard/
│   │   ├── plan/                 # Meal plan pages
│   │   ├── recipes/              # Recipe browser
│   │   ├── shopping/             # Shopping list
│   │   ├── tracking/             # Health log
│   │   ├── routines/             # Morning/evening routines
│   │   ├── chat/                 # AI chat
│   │   ├── learn/                # Knowledge base
│   │   └── settings/
│   └── api/                      # API routes
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── plan/                     # Meal plan UI
│   ├── recipes/                  # Recipe UI
│   ├── shopping/                 # Shopping UI
│   ├── tracking/                 # Tracking UI
│   └── shared/                   # Shared components
├── lib/
│   ├── services/                 # Business logic
│   │   ├── MealPlanGenerator.ts
│   │   ├── NutritionCalculator.ts
│   │   ├── ScalingEngine.ts
│   │   ├── SubstitutionEngine.ts
│   │   ├── ShoppingListBuilder.ts
│   │   ├── MediterraneanScorer.ts
│   │   └── AICoach.ts
│   ├── ai/                       # AI integration
│   │   ├── client.ts
│   │   ├── prompts/
│   │   └── parsers/
│   ├── db/                       # Database utilities
│   ├── utils/                    # Helper utilities
│   └── types/                    # TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── data/
│   ├── diets/                    # PDF diets (git-ignored)
│   ├── parsed/                   # Parsed diet JSONs
│   └── mediterranean-rules.json
├── scripts/                      # Utility scripts
│   ├── parse-diet-pdf.ts
│   ├── enrich-ingredients.ts
│   └── validate-med-score.ts
└── public/                       # Static assets, PWA icons
```

---

## Development Phases

### Phase 1: MVP (4-6 weeks)
**Goal:** Working app with recipe base, simple meal plan generator, shopping list.
**Database:** SQLite (simple, no setup needed)
**Auth:** Optional for MVP (can skip or use simple session)

**Weeks 1-2:** Project setup + data model
- Initialize Next.js + Prisma + SQLite
- Basic single-user setup (skip auth for now if not needed)
- Create onboarding flow (optional)

**Weeks 2-3:** PDF parser + recipe database seeding
- Parse diet PDFs with Claude API
- Seed database with recipes and ingredients
- Enrich ingredient data (omega-3, MUFA, etc.)

**Weeks 3-4:** Deterministic meal plan generator
- Implement `MealPlanGenerator.ts` service
- UI: weekly meal plan view, cooking day timeline

**Weeks 4-5:** Shopping list generator
- Implement `ShoppingListBuilder.ts`
- UI: shopping list with categories, checkboxes

**Weeks 5-6:** PWA + mobile support
- Configure next-pwa
- Responsive design, offline caching

### Phase 2: Intelligence (3-4 weeks)
**Goal:** AI-powered generation, smart substitutions, health tracking, multi-user support.
**Database Migration:** SQLite → Supabase (PostgreSQL)

**Database migration steps:**
1. Finalize Prisma schema
2. Create Supabase project
3. Update `.env` with Supabase connection string
4. Run: `npx prisma migrate deploy` (creates PostgreSQL schema)
5. Run seed script against Supabase
6. Add Supabase Auth (email, Google OAuth)
7. Implement RLS policies (users see only their household data)
8. Test multi-user scenarios

**Phase 2 features:**
- Claude API meal plan generation
- Ingredient substitution system
- AI chat interface
- Health log (mood, energy, sleep, weight, water)
- Dashboard with charts and analytics
- Dual-person meal plan views with smart scaling

### Phase 3: Coaching (3-4 weeks)
**Goal:** Routines, dopamine detox, AI coaching, exports.

- Morning/evening routines with timers
- Dopamine detox 30-day tracker
- Personalized AI coaching
- Knowledge base (articles from PDFs)
- PDF export + sharing

### Phase 4: Polish (2-3 weeks)
**Goal:** External integrations, optimization, community.

- USDA FoodData Central integration
- Barcode scanner
- Meal prep optimizer (Gantt chart timeline)
- Performance optimization
- UX improvements (animations, loaders, onboarding tour)

---

## Mediterranean Diet Profile

### Scientific Basis
- **Evidence:** Meta-analyses show 12% lower stroke risk, 30% reduction in cardiovascular events vs low-fat diets
- **Key Studies:** Lyon Diet Heart Study, PREDIMED Trial, Italian Scientific Societies (2025)
- **Benefits:** CVD prevention, diabetes prevention, cognitive health, reduced cancer risk

### Macro Targets
For 3000 kcal / 1800 kcal:

| Nutrient | Range | 3000 kcal | 1800 kcal |
|----------|-------|-----------|-----------|
| Carbs | 40-50% | 300-375g | 180-225g |
| Fat | 30-35% | 100-117g | 60-70g |
| Protein | 15-25% | 113-188g | 68-113g |
| Fiber | 25-35g | 35g | 28g |

**Key Ratios:**
- **MUFA:SFA ≥ 2.0** (olive oil as main fat)
- **Omega-3 ≥ 1.6g/day** (fatty fish 3×/week)
- **Fiber ≥ 25g/day** (vegetables, legumes, whole grains)

### Weekly Rules

| Category | Frequency | Examples |
|----------|-----------|----------|
| Vegetables | Daily, min 5 servings | Tomatoes, spinach, eggplant, peppers |
| Fruits | 2-3 servings/day | Figs, grapes, citrus, apples |
| Whole grains | Every main meal | Buckwheat, brown rice, whole wheat pasta |
| Olive oil | Daily, main fat | As dressing, cooking, with bread |
| Fish/seafood | ≥ 3×/week | Salmon, sardines, mackerel, cod |
| Legumes | ≥ 3×/week | Chickpeas, lentils, beans |
| Nuts/seeds | Daily, handful | Almonds, walnuts, flax, sesame |
| Fermented dairy | Moderate | Greek yogurt, feta, pecorino |
| Poultry | 2-3×/week | Chicken, turkey |
| Eggs | 2-4/week | In breakfasts, omelets |
| Red meat | Max 2×/month | Beef, lamb (small portions) |
| Processed meat | Avoid | — |

### Mediterranean Diet Score (MDS)
Each meal plan scores 0-14 points:
- Vegetables (≥5/day) = 1 pt
- Fruits (≥2/day) = 1 pt
- Legumes (≥3×/week) = 1 pt
- Fish (≥3×/week) = 1 pt
- Olive oil daily = 1 pt
- Whole grains per meal = 1 pt
- Nuts daily = 1 pt
- Fermented dairy (≥3×/week) = 1 pt
- Poultry > red meat = 1 pt
- Red meat (≤2×/month) = 1 pt
- No processed meat = 1 pt
- MUFA:SFA ≥ 2.0 = 1 pt
- Omega-3 ≥ 1.6g = 1 pt
- Fiber ≥ 25g = 1 pt

**Target: ≥10/14** = high Mediterranean alignment.

---

## Batch Cooking System

### Weekly Repetition Rules

| Meal | Days | Default | Example |
|------|------|---------|---------|
| Lunch | 2-3 days | ×3 | Cook Sunday → eat Mon-Wed |
| Dinner | 2-3 days | ×2-3 | Soup Sunday → eat Mon-Tue (+fresh bread) |
| Breakfast | 3-4 days (2 variants) | ×3 + ×4 | Oatmeal Mon-Wed, eggs Thu-Sun |
| Snack | No repetition | ×1 | Nuts, fruits, hummus |

### Cooking Days
**Default:** Sunday + Wednesday

**Sunday (main cooking day):**
- Lunch for Mon-Wed (batch ×3 days × people)
- Dinner for Mon-Tue/Wed (soup/stew batch)
- Breakfast prep for Mon-Wed (overnight oats, chopped veggies)

**Wednesday (small cooking day):**
- Lunch for Thu-Sat (batch ×3 days × people)
- Dinner for Thu-Sat (new soup/casserole)
- Breakfast prep for Thu-Sun

**Sunday meals:** Cook fresh (cooking day = fresh meal)

### Freshness Tracking

| Category | Max storage | Notes |
|----------|-------------|-------|
| Veggie soups | 3-4 days | Glass container in fridge |
| Soups with meat | 2-3 days | Fridge, reheat to boiling |
| Fish dishes | 1-2 days | Salmon ~2 days, shellfish 1 day |
| Chicken dishes | 3 days | Fridge, don't leave at room temp |
| Cooked legumes | 3-4 days | Sealed container |
| Rice/buckwheat | 2-3 days | Cool quickly after cooking |
| Salads (undressed) | 1-2 days | Dressing separate |

System auto-marks day 1/2/3 in meal plan and alerts when meal should be eaten.

---

## Portion Scaling

### Calculation Logic

```
total_servings = (servings_person_A + servings_person_B) × batch_days

Per ingredient:
  if scales_linearly:
    total_g = amount_g_per_serving × total_servings
  else:
    total_g = amount_g_per_serving × scaling_factor(total_servings)
```

### Scaling Types

| Type | Formula | Examples |
|------|---------|----------|
| Linear | `×N` | Meat, vegetables, grains, dairy, legumes |
| Square root | `×√N` | Cooking oil, baking butter |
| Logarithmic | `×(1 + ln(N))` | Garlic, onion (flavor base) |
| Fixed threshold | `×1 (N≤4), ×1.5 (N>4)` | Salt, pepper, dry herbs |
| Custom | Per ingredient | Baked goods (special ratios) |

### Different Caloric Goals
When Person A has 3000 kcal and Person B has 1800 kcal:
- Same recipe, different servings
- Person A: 1.5 serving, Person B: 0.9 serving (proportional)
- Calculation: `serving_ratio = user_kcal_target / recipe_kcal_per_serving`
- Display separate gram amounts per person

---

## AI Integration Strategy

### Core System Prompts

#### 1. Mediterranean Meal Plan Generator
- Expert on Mediterranean diet & batch cooking optimization
- Generates weekly plans balanced in Mediterranean profile
- Respects batch cooking constraints (2-3 day meals)
- Considers shelf life of ingredients
- Outputs structured JSON with batch groups, cooking sessions, shopping list

**Key rules:**
- Lunch: 1 recipe for 2-3 days (batch-friendly only)
- Dinner: 1 recipe for 2-3 days (soups, one-pots, casseroles)
- 2 breakfast variants per week (each 3-4 days)
- Max 2 cooking days (Sunday + Wednesday)
- Daily calories ≈ target ±10%
- Mediterranean Score target ≥10/14

#### 2. Substitution Engine
- Expert on Mediterranean diet substitutions
- Given ingredient + recipe context, suggests swap
- Returns macro diff and Mediterranean Score impact
- Prioritizes same food category substitutes
- Maintains macro proportions (±10%)

**Substitution rules from diets:**
- Oils: olive, flax, rice bran, hemp, nigella, evening primrose
- Plant milk: coconut, oat, almond, hazelnut
- Starches: 1 sweet potato = 4 regular potatoes = 60g buckwheat/rice/pasta
- Proteins: salmon ↔ cod ↔ mackerel (same gram amount)

#### 3. Health Coach
- Personal health coach with Mediterranean diet + dopamine + routines knowledge
- Context: last 7 days health_log + active meal plan + routines
- Style: Concrete, supportive, data-driven. No generic tips.
- Gives 2-3 actionable suggestions, not 10 tips
- Refers to user's real data

#### 4. PDF Diet Parser
- Extracts recipes from diet PDFs using Claude API
- For each meal: name, type, ingredients with grams, macros, instructions
- Extracts substitution rules (e.g., "oils interchangeable: olive, flax, rice bran...")
- Output: structured JSON for seeding

---

## Key Services to Build

### MealPlanGenerator.ts
Deterministic algorithm for Phase 1:
1. Pick 2-3 batch-friendly lunch recipes (different proteins)
2. Pick 2-3 dinner recipes (soups, one-pots)
3. Pick 2 breakfast variants
4. Distribute batch groups across weekdays
5. Calculate servings per person
6. Validate: daily kcal ≈ target ±10%
7. Calculate Mediterranean Diet Score

### NutritionCalculator.ts
- Per-serving macros from ingredients
- Per-batch macros (×servings)
- Daily summary per person

### ScalingEngine.ts
- Implements 5 scaling types (linear, sqrt, log, fixed, custom)
- Per-ingredient scaling rules
- Macro validation after scaling

### SubstitutionEngine.ts
- Lookup in `IngredientSubstitute` table
- Fallback to Claude API if no rule
- Gram recalculation by ratio
- Macro recalculation
- Mediterranean Score impact check

### ShoppingListBuilder.ts
- Aggregate ingredients from batch groups
- Combine X in recipe A (300g) + recipe B (150g) = 450g total
- Multiply by batch_group.total_servings
- Round to practical amounts (340g carrots → 350g)
- Group by category (vegetables, fruits, meat, dairy, grains, spices)

### MediterraneanScorer.ts
- Score each meal plan 0-14 points
- Check all 14 MDS criteria
- Flag recipes that lower score

---

## Important Database Patterns

### Household Model
- Multi-user support (primary + partner) — **Phase 2+**
- Own meal plans, shopping lists, cooking sessions
- RLS (Row-Level Security): users can only see their household data — **Phase 2+ (Supabase)**
- **Phase 1:** Single user, no RLS needed

### Recipe Model
- `baseServings`: default portion count
- `batchFriendly`: boolean (zupy ✓, sałatki ✗)
- `maxStorageDays`: 1-4 days for freshness tracking
- `sourceDiet`: which PDF this came from (for traceability)
- `mediterraneanScore`: 0-5 (per-recipe score for sorting)

### MealPlanMeal Model
- `batchGroupId`: links to parent batch group
- `batchDayNumber`: 1/2/3 within batch (for freshness alerts)
- `servingsPersonA` / `servingsPersonB`: individual scaling
- Allows different portion sizes per person

### RecipeIngredient Model
- `amountGPerServing`: CRUCIAL — per 1 serving, not per batch
- `scalesLinearly`: false for oil, spices (use custom scaling)
- `displayText`: "2 tbsp extra virgin olive oil" (for human readability)

### IngredientSubstitute Model
- `ratio`: 1.0 = same gram amount, 0.8 = substitute uses 80% of original
- `conversionNote`: "1 sweet potato = 4 regular potatoes = 60g buckwheat"
- `sameMedScore`: does substitute maintain Mediterranean Score?

---

## Development Conventions

### TypeScript
- Strict mode enabled
- Type models matching Prisma schema
- Use Zod for API validation

### API Routes
- Use Next.js App Router API routes (`app/api/`)
- Implement rate limiting for AI endpoints
- Return `{ data: ..., error?: string }` shape
- Always validate input with Zod

### Components
- Use shadcn/ui for base components
- Mobile-first Tailwind styling
- Server components when possible (Next.js 14+)
- Client components only when needed (interactivity)

### Database
- Prisma migrations for schema changes
- Use transaction for multi-step operations
- Implement RLS at Supabase level
- Keep `seed.ts` idempotent (safe to run multiple times)

### AI Integration
- Use Anthropic SDK (not raw HTTP)
- Implement fallbacks for AI failures
- Cache expensive Claude calls in DB when appropriate
- Always include timeout handling

---

## Deployment Options

### Option A: Vercel (Recommended for Phase 1)
**Pros:**
- ✅ Zero config, git push to deploy
- ✅ Free tier (perfect for MVP)
- ✅ Auto-scaling, CDN, instant SSL
- ✅ Environment variables, logs, monitoring built-in
- ✅ SQLite works (serverless + external DB okay)
- ✅ No DevOps work — focus on code

**Cons:**
- Limited to Vercel's ecosystem
- Serverless cold starts (usually <500ms)

**Cost:** Free for MVP, $20-50/month as you scale

---

### Option B: Your Private VPS
**Pros:**
- ✅ Full control
- ✅ Keep data on your own server
- ✅ No vendor lock-in
- ✅ Might be cheaper if you already own it

**Cons:**
- ❌ You manage uptime, backups, security patches
- ❌ No auto-scaling — VPS goes down = app goes down
- ❌ Need DevOps knowledge (nginx, PM2, SSL, monitoring)
- ❌ Responsibility for database backups
- ❌ Takes more maintenance time

**Minimum VPS specs:**
- CPU: Single core OK for Phase 1 (1-2 recommended)
- RAM: **1-2GB minimum** (512MB too tight with PostgreSQL)
- Storage: **20GB+ free space** (SQLite uses minimal, but room for growth)
- Network: Standard connection fine (your solo usage minimal)

**VPS Setup Required:**
```bash
# On your VPS:
- Node.js 18+ (nvm recommended)
- PostgreSQL or SQLite (if PostgreSQL, ~150MB RAM)
- Nginx as reverse proxy
- PM2 or systemd for process management
- Let's Encrypt SSL cert (free)
- Automated backups (critical!)
- Monitoring & alerting

# Deployment:
- Git pull + npm install + npm build + pm2 restart
- Or use Docker for easier management
```

**Backup Strategy (critical!):**
```bash
# Daily SQLite backup to your machine
sqlite3 /var/www/nutrimind/prisma/dev.db ".backup '/backups/nutrimind-$(date +%Y%m%d).db'"
```

---

### Honest Assessment for Your VPS:

**If it has:**
- ✅ 1GB+ RAM → Can run it
- ✅ Stable uptime (99%+) → Good candidate
- ❌ Shared CPU/RAM → Might struggle when Claude API calls spike
- ❌ You don't want DevOps work → Use Vercel instead

**My recommendation:**
- **Phase 1:** Use Vercel (focus on building, not ops)
- **Phase 2+:** Migrate to your VPS once app is stable (smaller DevOps surface)
- Or **use VPS from day 1 if you enjoy system administration**

The good news: **Next.js apps are highly portable.** You can start on Vercel and move to VPS anytime, or vice versa. Just update your domain DNS.

---

## Database Strategy

### Phase 1: SQLite
**Setup:**
```bash
npm install @prisma/client prisma
npx prisma init
# In .env: DATABASE_URL="file:./prisma/dev.db"
```

**Advantages:**
- ✅ Zero setup, instant development
- ✅ File-based (version control friendly with `.gitignore`)
- ✅ Fast local queries
- ✅ Perfect for solo MVP work
- ✅ No cost whatsoever

**Limitations (fine for MVP):**
- Single-writer (no concurrent batch operations)
- Not ideal for multi-user (partner access)
- Can't do Row-Level Security
- File-based backup only

### Phase 2: Supabase PostgreSQL Migration
When Phase 2 features (multi-user, health tracking, sharing) require it:

**Quick migration:**
1. Create Supabase project (free tier)
2. Copy `.env.local`:
   ```
   DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"
   SUPABASE_URL="https://xxx.supabase.co"
   SUPABASE_ANON_KEY="xxx"
   ```
3. Run: `npx prisma migrate deploy` (applies all migrations to PostgreSQL)
4. Run seed script
5. **No schema changes needed** — Prisma handles both!

The good news: **All Prisma code stays identical.** Only the database backend changes.

---

## Workflow Tips

### When Adding a New Recipe Source
1. Place PDF in `data/diets/`
2. Run: `npx ts-node scripts/parse-diet-pdf.ts data/diets/filename.pdf`
3. Verify output: `cat data/parsed/filename.json`
4. Enrich: `npx ts-node scripts/enrich-ingredients.ts data/parsed/filename.json`
5. Seed: `npx prisma db seed`
6. Test generator with new recipes

### When Modifying Prisma Schema
1. Make changes in `prisma/schema.prisma`
2. Run: `npx prisma migrate dev --name brief_description`
3. Commit migration file
4. Run: `npx prisma generate`

### Testing Meal Plan Generation
1. Use deterministic generator first (Phase 1)
2. Verify Mediterranean Score ≥10
3. Verify daily kcal ±10% of targets
4. Check batch groups don't exceed `maxStorageDays`
5. Ensure 2 cooking days only

### Debugging AI Responses
- Log full Claude response before parsing
- Check token count if response truncated
- Test fallback to deterministic generator
- Validate JSON before storing

---

## Known Constraints

### MVP Phase Constraints (Phase 1)
- No AI meal plan generation (Phase 2)
- No health tracking (Phase 2)
- No routines/coaching (Phase 3)
- Recipe browser is read-only (no user contributions)
- Portion scaling is 2-person only (initial)
- No real-time collaboration (Phase 4)

### Performance Constraints
- Keep API responses < 3 seconds (Phase 4: < 1 second with caching)
- Cache meal plans for 24 hours
- Use pagination for large recipe lists
- Optimize recipe ingredient lookups with DB indexes

### Scaling Rules
- Must preserve macro integrity (±10%)
- Non-linear scaling for: oils, spices, flavor bases
- Always validate total batch servings vs storage days

---

## Success Criteria per Phase

### Phase 1 ✓
- [ ] SQLite database initialized with Prisma
- [ ] Database loaded with ≥30 recipes from diets
- [ ] Generator creates weekly plan with batch cooking
- [ ] Plan view shows meal layout with batch group colors
- [ ] Shopping list auto-generates from plan
- [ ] PWA works on mobile phone
- [ ] Portions scale for 2 people with different kcal
- [ ] *(Optional: Simple login or none needed)*

### Phase 2 ✓
- [ ] Database migrated to Supabase PostgreSQL
- [ ] Supabase Auth implemented (email + Google OAuth)
- [ ] RLS policies protect per-household data
- [ ] Claude API generates meal plans (better than deterministic)
- [ ] One-click ingredient substitution
- [ ] AI chat answers diet questions
- [ ] Health log: mood, energy, sleep, weight, water
- [ ] Dashboard: weight trends, macro charts, Mediterranean Score
- [ ] Dual-person views work smoothly
- [ ] Partner can log in and see shared meal plans

### Phase 3 ✓
- [ ] Morning/evening routines with timers
- [ ] 30-day dopamine detox tracker
- [ ] AI coach gives personalized suggestions
- [ ] PDF export of meal plan, shopping list, cooking schedule
- [ ] Share meal plan via link

### Phase 4 ✓
- [ ] USDA integration for new ingredients
- [ ] Barcode scanner in store
- [ ] Cooking timeline with parallel task optimization
- [ ] Lighthouse score > 90
- [ ] Onboarding tour for new users

---

*This guide evolves as the project progresses. Update when new patterns emerge or constraints change.*
