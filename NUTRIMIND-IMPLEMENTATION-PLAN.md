# 🫒 NutriMind Mediterranean — Plan Implementacji

> AI-powered asystent zdrowia i diety z profilem śródziemnomorskim, batch cooking i skalowaniem porcji dla 2 osób.

---

## Spis treści

1. [Wizja produktu](#1-wizja-produktu)
2. [Tech Stack](#2-tech-stack)
3. [Schemat bazy danych](#3-schemat-bazy-danych)
4. [Faza 1 — MVP (4-6 tygodni)](#4-faza-1--mvp-4-6-tygodni)
5. [Faza 2 — Inteligencja (3-4 tygodnie)](#5-faza-2--inteligencja-3-4-tygodnie)
6. [Faza 3 — Coaching (3-4 tygodnie)](#6-faza-3--coaching-3-4-tygodnie)
7. [Faza 4 — Polish (2-3 tygodnie)](#7-faza-4--polish-2-3-tygodnie)
8. [Struktura projektu](#8-struktura-projektu)
9. [Profil śródziemnomorski — baza naukowa](#9-profil-śródziemnomorski--baza-naukowa)
10. [System batch cooking](#10-system-batch-cooking)
11. [Skalowanie porcji](#11-skalowanie-porcji)
12. [Pipeline importu diet](#12-pipeline-importu-diet)
13. [AI Prompting Strategy](#13-ai-prompting-strategy)
14. [Architektura systemu](#14-architektura-systemu)

---

## 1. Wizja produktu

**Problem:** Mam wiele diet od dietetyków (PDF), ale codzienne planowanie posiłków, przeliczanie porcji na 2 osoby, robienie listy zakupów i gotowanie batch to żmudna robota ręczna.

**Rozwiązanie:** Aplikacja, która:
- Importuje diety z PDF-ów jako bazę przepisów
- Generuje tygodniowy jadłospis zbilansowany w profilu śródziemnomorskim
- Optymalizuje pod batch cooking (gotuj 2×/tydzień, jedz cały tydzień)
- Automatycznie skaluje porcje na 2 osoby z różnymi celami kalorycznymi
- Generuje listę zakupów, harmonogram gotowania i śledzi postępy

**Użytkownicy:** Ja + partnerka. Docelowo: każdy kto chce jeść zdrowo bez codziennego planowania.

---

## 2. Tech Stack

| Warstwa | Technologia | Uzasadnienie |
|---------|-------------|--------------|
| Frontend | **Next.js 14+ (App Router)** | SSR, API routes w jednym repo, deploy na Vercel |
| Język | **TypeScript** | Bezpieczeństwo typów przy obliczeniach żywieniowych |
| UI | **Tailwind CSS + shadcn/ui** | Szybki dev, mobile-first, spójny design system |
| Baza danych | **Supabase (PostgreSQL)** | Darmowy tier, auth, RLS, real-time |
| ORM | **Prisma** | Type-safe queries, migracje, auto-generowane typy |
| AI | **Claude API (Anthropic)** | Generowanie jadłospisów, zamienniki, coaching |
| Mobile | **PWA (next-pwa)** | Jedna codebase = web + apka na telefon |
| Deploy | **Vercel + Supabase Cloud** | Zero-config, auto-scaling, darmowy tier |
| Charts | **Recharts** | Wykresy makro, wagi, Mediterranean Score |

---

## 3. Schemat bazy danych

### 3.1 Tabele core

```prisma
model Household {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  users     User[]
  mealPlans MealPlan[]
  shoppingLists ShoppingList[]
  cookingSessions CookingSession[]
}

model User {
  id              String   @id @default(cuid())
  householdId     String
  household       Household @relation(fields: [householdId], references: [id])
  email           String   @unique
  name            String
  role            String   @default("primary") // primary | partner
  kcalTarget      Int
  proteinPct      Int      @default(20) // % z kcal
  carbsPct        Int      @default(45)
  fatPct          Int      @default(35)
  fiberTargetG    Int      @default(30)
  allergies       String[] @default([])
  preferences     String[] @default([])
  dietProfile     String   @default("mediterranean")
  createdAt       DateTime @default(now())
  healthLogs      HealthLog[]
  routines        Routine[]
}
```

### 3.2 Składniki i przepisy

```prisma
model Ingredient {
  id              String   @id @default(cuid())
  name            String   @unique
  namePl          String
  category        String   // warzywa, owoce, zbożowe, białko, tłuszcze, nabiał, przyprawy
  subcategory     String?
  kcalPer100g     Float
  protein         Float    // g per 100g
  carbs           Float
  fat             Float
  fiber           Float
  omega3          Float?   // mg per 100g
  mufa            Float?   // g per 100g
  pufa            Float?
  sfa             Float?
  glycemicIndex   Int?
  isWholeGrain    Boolean  @default(false)
  isMediterranean Boolean  @default(false)
  season          String[] @default([]) // spring, summer, autumn, winter
  shelfLifeDays   Int      @default(3)
  tags            String[] @default([])
  substitutes     IngredientSubstitute[] @relation("original")
  substituteOf    IngredientSubstitute[] @relation("substitute")
  recipeIngredients RecipeIngredient[]
}

model IngredientSubstitute {
  id              String     @id @default(cuid())
  ingredientId    String
  ingredient      Ingredient @relation("original", fields: [ingredientId], references: [id])
  substituteId    String
  substitute      Ingredient @relation("substitute", fields: [substituteId], references: [id])
  ratio           Float      @default(1.0) // 1.0 = taka sama gramatura
  conversionNote  String?    // "1 batat = 4 ziemniaki = 60g kaszy"
  sameMedScore    Boolean    @default(true)
}

model Recipe {
  id                String   @id @default(cuid())
  name              String
  mealType          String   // breakfast | lunch | dinner | snack
  prepTimeMin       Int
  cookTimeMin       Int
  batchFriendly     Boolean  @default(false)
  maxStorageDays    Int      @default(1)
  baseServings      Int      @default(1)
  instructions      String[] @default([])
  sourceDiet        String?  // nazwa pliku PDF
  mediterraneanScore Int     @default(0) // 0-5
  tags              String[] @default([])
  seasonBest        String[] @default([])
  ingredients       RecipeIngredient[]
  mealPlanMeals     MealPlanMeal[]
  batchGroups       BatchGroup[]
}

model RecipeIngredient {
  id              String     @id @default(cuid())
  recipeId        String
  recipe          Recipe     @relation(fields: [recipeId], references: [id])
  ingredientId    String
  ingredient      Ingredient @relation(fields: [ingredientId], references: [id])
  amountGPerServing Float    // gramatura PER 1 PORCJĘ
  unit            String     @default("g")
  scalesLinearly  Boolean    @default(true) // false dla oleju, przypraw
  displayText     String?    // "2 łyżki oliwy extra virgin"
}
```

### 3.3 Jadłospisy i batch cooking

```prisma
model MealPlan {
  id                    String   @id @default(cuid())
  householdId           String
  household             Household @relation(fields: [householdId], references: [id])
  weekStart             DateTime
  weekEnd               DateTime
  dietProfile           String   @default("mediterranean")
  totalMediterraneanScore Int    @default(0) // 0-14
  status                String   @default("draft") // draft | active | completed
  cookingDays           String[] @default([]) // ["sunday", "wednesday"]
  meals                 MealPlanMeal[]
  batchGroups           BatchGroup[]
  shoppingList          ShoppingList?
  createdAt             DateTime @default(now())
}

model MealPlanMeal {
  id              String    @id @default(cuid())
  mealPlanId      String
  mealPlan        MealPlan  @relation(fields: [mealPlanId], references: [id])
  dayOfWeek       Int       // 1=pon, 7=ndz
  mealType        String    // breakfast | lunch | dinner | snack
  recipeId        String
  recipe          Recipe    @relation(fields: [recipeId], references: [id])
  batchGroupId    String?
  batchGroup      BatchGroup? @relation(fields: [batchGroupId], references: [id])
  batchDayNumber  Int?      // dzień 1, 2 lub 3 w batchu
  servingsPersonA Float     @default(1.0)
  servingsPersonB Float?    // null jeśli 1 osoba
}

model BatchGroup {
  id                  String   @id @default(cuid())
  mealPlanId          String
  mealPlan            MealPlan @relation(fields: [mealPlanId], references: [id])
  recipeId            String
  recipe              Recipe   @relation(fields: [recipeId], references: [id])
  cookDate            DateTime
  totalServings       Float
  daysSpan            Int      // ile dni pokrywa
  storageInstructions String?
  meals               MealPlanMeal[]
}

model CookingSession {
  id              String    @id @default(cuid())
  householdId     String
  household       Household @relation(fields: [householdId], references: [id])
  date            DateTime
  batchGroupIds   String[]
  totalPrepTime   Int       // minuty
  totalCookTime   Int
  timelineSteps   Json      // [{time: "16:00", action: "Włącz piekarnik", duration: 5}, ...]
}
```

### 3.4 Zakupy, tracking, rutyny

```prisma
model ShoppingList {
  id              String   @id @default(cuid())
  mealPlanId      String   @unique
  mealPlan        MealPlan @relation(fields: [mealPlanId], references: [id])
  householdId     String
  items           Json     // [{ingredientId, name, totalG, category, checked}]
  createdAt       DateTime @default(now())
}

model HealthLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  date            DateTime
  mood            Int?     // 1-5
  energy          Int?     // 1-5
  sleepHours      Float?
  sleepQuality    Int?     // 1-5
  weight          Float?   // kg
  waterMl         Int?
  notes           String?
  createdAt       DateTime @default(now())
}

model Routine {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  type            String   // morning | evening
  items           Json     // [{name, order, completedToday}]
  createdAt       DateTime @default(now())
}
```

---

## 4. Faza 1 — MVP (4-6 tygodni)

Cel: działająca aplikacja z bazą przepisów, prostym generatorem jadłospisów i listą zakupów.

### Tydzień 1-2: Setup + Data Model

- [ ] **Inicjalizacja projektu**
  - `npx create-next-app@latest nutrimind --typescript --tailwind --app`
  - Konfiguracja Supabase (projekt, klucze API)
  - Konfiguracja Prisma (`prisma init`, connection string)
  - Instalacja zależności: `@supabase/supabase-js`, `@prisma/client`, `shadcn/ui`
  - Setup ESLint, Prettier, husky

- [ ] **Schemat Prisma**
  - Utworzenie wszystkich modeli z sekcji 3
  - `npx prisma migrate dev --name init`
  - Wygenerowanie klienta: `npx prisma generate`

- [ ] **Autentykacja**
  - Supabase Auth (email + Google OAuth)
  - Middleware Next.js do ochrony tras
  - Strony: `/login`, `/register`, `/onboarding`

- [ ] **Onboarding flow**
  - Krok 1: Dane osobowe (imię, waga, wzrost)
  - Krok 2: Cel kaloryczny (auto-kalkulacja lub ręczne)
  - Krok 3: Ile osób? (1 lub 2) → utwórz Household
  - Krok 4: Preferencje i alergie
  - Krok 5: Cooking days (np. niedziela + środa)

### Tydzień 2-3: Seeder + Baza przepisów

- [ ] **Parser diet PDF**
  - Skrypt `scripts/parse-diet-pdf.ts`
  - Użycie Claude API do ekstrakcji z PDF:
    - Nazwy posiłków, typ (śniadanie/obiad/kolacja)
    - Lista składników z gramaturami
    - Makroskładniki per posiłek
    - Instrukcje przygotowania
    - Zasady zamienników
  - Output: `data/parsed/[diet-name].json`

- [ ] **Seeder bazy danych**
  - Skrypt `prisma/seed.ts`
  - Import składników z parsowanych diet (deduplikacja po nazwie)
  - Import przepisów z powiązaniem do składników
  - Oznaczenie `batchFriendly`, `maxStorageDays`, `mediterraneanScore`
  - Import reguł zamienników

- [ ] **Enrichment składników**
  - Skrypt `scripts/enrich-ingredients.ts`
  - Dodanie brakujących danych: omega3, MUFA, PUFA, SFA
  - Flagi: `isMediterranean`, `isWholeGrain`
  - Źródło: Claude API + dane z USDA/IŻŻ (hardcoded na start)

- [ ] **UI: Przeglądarka przepisów**
  - Strona `/recipes` — lista przepisów z filtrami
  - Filtry: typ posiłku, czas przygotowania, batch-friendly, med score
  - Strona `/recipes/[id]` — szczegóły przepisu
    - Składniki z gramaturkami
    - Suwak: liczba porcji (1-8)
    - Makro per porcja
    - Instrukcje krok po kroku

### Tydzień 3-4: Generator jadłospisów

- [ ] **Algorytm generatora (wersja deterministyczna)**
  - Service: `lib/services/MealPlanGenerator.ts`
  - Input: household config (osoby, kcal, cooking days, powtarzalność)
  - Logika:
    1. Wybierz 2-3 przepisy obiadowe (batch-friendly, różne białka)
    2. Wybierz 2-3 przepisy na kolację (zupy, jednogarnkowe)
    3. Wybierz 2 warianty śniadań
    4. Rozłóż batch grupy po dniach tygodnia
    5. Oblicz porcje per osoba
    6. Waliduj: suma kcal/dzień ≈ target per osoba (±10%)
    7. Oblicz Mediterranean Diet Score

- [ ] **UI: Widok tygodnia**
  - Strona `/plan` — siatka 7 dni × 3 posiłki
  - Kolory batch grup (np. zielony = zupa soczewicowa pon-śr)
  - Klik na posiłek → szczegóły + makro
  - Badge: "Dzień 1/3" dla batch posiłków
  - Podsumowanie dnia: kcal, białko, węgle, tłuszcze (per osoba)
  - Mediterranean Score badge

- [ ] **UI: Widok cooking day**
  - Strona `/plan/cook/[date]`
  - Lista przepisów do przygotowania
  - Timeline: co robić i kiedy
  - Checkboxy do odhaczania kroków

### Tydzień 4-5: Lista zakupów

- [ ] **Generator listy zakupów**
  - Service: `lib/services/ShoppingListBuilder.ts`
  - Agregacja składników z batch grup:
    - Składnik X w przepisie A (300g) + przepisie B (150g) = 450g
    - Mnożenie przez total_servings w batch grupie
  - Grupowanie po kategoriach (warzywa, owoce, mięso/ryby, nabiał, zbożowe, przyprawy)
  - Zaokrąglanie do praktycznych ilości (np. 340g marchewki → 350g)

- [ ] **UI: Lista zakupów**
  - Strona `/shopping`
  - Checkboxy do odhaczania
  - Grupowanie po kategoriach ze składanymi sekcjami
  - Podsumowanie: ile pozycji, szacowany czas zakupów
  - Przycisk: "Udostępnij" (link do listy)

### Tydzień 5-6: PWA + Mobile

- [ ] **Konfiguracja PWA**
  - Instalacja `next-pwa`
  - Manifest: ikona, splash screen, kolory
  - Service Worker: cache przepisów i aktywnego planu
  - Prompt "Dodaj do ekranu głównego"

- [ ] **Responsive design**
  - Mobile-first: wszystkie strony testowane na 375px
  - Bottom navigation bar (mobile)
  - Side navigation (desktop)
  - Gestury: swipe do zmiany dnia w planie

- [ ] **Offline support**
  - Cache aktywnego jadłospisu
  - Cache listy zakupów
  - Sync po powrocie online

---

## 5. Faza 2 — Inteligencja (3-4 tygodnie)

Cel: AI-powered generowanie jadłospisów, inteligentne zamienniki, health tracking.

### Tydzień 7-8: Claude API Integration

- [ ] **AI Meal Plan Generator**
  - Endpoint: `POST /api/ai/generate-plan`
  - System prompt z zasadami śródziemnomorskimi (patrz sekcja 13)
  - Context: dostępne przepisy z bazy, preferencje użytkownika
  - Output: structured JSON z jadłospisem
  - Fallback: deterministyczny generator jeśli AI fail

- [ ] **System zamienników**
  - Endpoint: `POST /api/ai/substitute`
  - Input: ingredient_id + kontekst przepisu
  - Logika:
    1. Sprawdź tabelę `IngredientSubstitute` (reguły z diet)
    2. Jeśli brak → Claude API sugeruje zamiennik
    3. Przelicz gramaturę wg ratio
    4. Przelicz makro
    5. Sprawdź czy zamiennik nie obniża Mediterranean Score
  - UI: przycisk "🔄 Zamień" przy każdym składniku

- [ ] **AI Chat**
  - Strona `/chat`
  - Kontekst: aktywny jadłospis + preferencje + health log
  - Pytania typu: "Co zamiast łososia?", "Jak urozmaicić śniadania?", "Czy ten plan jest zbilansowany?"
  - Streaming responses (Anthropic SDK)

### Tydzień 8-9: Health Tracking

- [ ] **Dziennik zdrowia**
  - Strona `/tracking`
  - Formularz: nastrój (emoji), energia (1-5), sen (godziny + jakość), waga, woda
  - Quick entry: 1 tap per metric
  - Notatki tekstowe

- [ ] **Wykresy i analityka**
  - Dashboard: `/dashboard`
  - Wykresy (Recharts):
    - Waga: trend ostatnich 30 dni
    - Makro: plan vs rzeczywistość (stacked bar per dzień)
    - Mediterranean Score: trend tygodniowy
    - Sen + energia: korelacja
  - Scoring dnia: ile % planu zrealizowano

- [ ] **Powiadomienia (PWA)**
  - Przypomnienie o posiłku (konfigurowane godziny)
  - Przypomnienie o piciu wody
  - Cooking day reminder ("Jutro gotowanie! Sprawdź listę zakupów")
  - Badge na ikonie PWA

### Tydzień 9-10: Zaawansowane skalowanie

- [ ] **Dual-person meal plan view**
  - Toggle: "Pokaż porcje dla: [Osoba A] [Osoba B] [Obie]"
  - Podświetlenie różnic w gramaturkach
  - Osobne podsumowanie makro per osoba per dzień

- [ ] **Smart scaling engine**
  - Service: `lib/services/ScalingEngine.ts`
  - Reguły skalowania:
    - Liniowe: mięso, warzywa, ziarna, nabiał → ×N
    - Pierwiastkowe: olej do smażenia → √N
    - Stałe: przyprawy (sól, pieprz) → ×1 do ×4 porcji, potem +50%
    - Custom: per składnik (konfigurowane w DB)
  - Walidacja: po skalowaniu sprawdź czy makro nadal się zgadzają

---

## 6. Faza 3 — Coaching (3-4 tygodnie)

Cel: rutyny zdrowotne, dopaminowy detoks, AI coaching, eksport.

### Tydzień 11-12: Rutyny i detoks

- [ ] **Rutyny poranne/wieczorne**
  - Strona `/routines`
  - Checklisty z drag & drop (kolejność)
  - Domyślne rutyny z PDF-ów (detoks dopaminowy):
    - Poranna: zimny prysznic, medytacja, oddychanie, spacer
    - Wieczorna: brak ekranów, magnesium, journaling
  - Timery wbudowane (np. 3 min zimny prysznic, 10 min medytacja)
  - Streak tracker (ile dni z rzędu)

- [ ] **Dopamine Detox Tracker**
  - 30-dniowe wyzwanie
  - Dzienne checklisty z PDF
  - Progress bar + calendar heatmap
  - Wiedza z PDF-ów o dopaminie (baza wiedzy)

### Tydzień 12-13: AI Coaching

- [ ] **Personalizowany coach**
  - Endpoint: `POST /api/ai/coach`
  - Context: health_log ostatnich 7 dni + aktywny plan + rutyny
  - Porady: "Twoja energia spadła w śr-pt — spróbuj dodać omega-3 na śniadanie"
  - Tygodniowy raport: Mediterranean Score, adherence, sugestie
  - Motywacja na podstawie streaks i postępów

- [ ] **Baza wiedzy**
  - Strona `/learn`
  - Artykuły z PDF-ów o dopaminie (parsowane do MD)
  - Artykuły o diecie śródziemnomorskiej
  - Suplementacja (z kontekstu diet)
  - Search po bazie wiedzy

### Tydzień 13-14: Eksport i sharing

- [ ] **Eksport do PDF**
  - Jadłospis tygodniowy (ładny format A4)
  - Lista zakupów
  - Harmonogram gotowania (cooking day timeline)
  - Biblioteka: `@react-pdf/renderer` lub `puppeteer`

- [ ] **Udostępnianie**
  - Link do jadłospisu (read-only, bez logowania)
  - QR code do listy zakupów
  - Kopiowanie jednego przepisu jako tekst

---

## 7. Faza 4 — Polish (2-3 tygodnie)

Cel: integracje zewnętrzne, optymalizacja, community.

### Tydzień 15-16: Integracje

- [ ] **Baza wartości odżywczych**
  - Integracja z USDA FoodData Central API
  - Polskie dane z IŻŻ (jeśli dostępne API)
  - Auto-enrichment nowych składników

- [ ] **Barcode scanner**
  - Skan kodu kreskowego produktu w sklepie
  - Dopasowanie do składnika w bazie
  - Info: makro, czy pasuje do planu, czy jest Mediterranean-friendly

- [ ] **Meal prep optimizer**
  - Algorytm: co gotować równolegle?
  - "Zupa na gazie (45 min) + kurczak w piekarniku (40 min) = czas łączny 50 min"
  - Wizualny timeline z Gantt chart

### Tydzień 16-17: Polish

- [ ] **Performance**
  - React Server Components dla statycznych stron
  - Edge functions dla API
  - Image optimization (next/image)
  - Lighthouse score > 90

- [ ] **UX improvements**
  - Animacje (Framer Motion)
  - Skeleton loaders
  - Onboarding tour (first-time user)
  - Feedback modals po key actions

- [ ] **Community (opcjonalnie)**
  - Dzielenie się przepisami (public recipes)
  - Oceny przepisów
  - Import przepisów od innych użytkowników

---

## 8. Struktura projektu

```
nutrimind/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx    # Główny dashboard
│   │   ├── plan/
│   │   │   ├── page.tsx          # Widok tygodnia
│   │   │   ├── generate/page.tsx # Generator jadłospisu
│   │   │   └── cook/[date]/page.tsx  # Cooking day view
│   │   ├── recipes/
│   │   │   ├── page.tsx          # Lista przepisów
│   │   │   └── [id]/page.tsx     # Szczegóły przepisu
│   │   ├── shopping/page.tsx     # Lista zakupów
│   │   ├── tracking/page.tsx     # Health log
│   │   ├── routines/page.tsx     # Rutyny poranne/wieczorne
│   │   ├── chat/page.tsx         # AI chat
│   │   ├── learn/page.tsx        # Baza wiedzy
│   │   └── settings/page.tsx     # Ustawienia
│   ├── api/
│   │   ├── ai/
│   │   │   ├── generate-plan/route.ts
│   │   │   ├── substitute/route.ts
│   │   │   ├── coach/route.ts
│   │   │   └── chat/route.ts
│   │   ├── recipes/route.ts
│   │   ├── meal-plans/route.ts
│   │   ├── shopping/route.ts
│   │   ├── health-log/route.ts
│   │   └── auth/route.ts
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── plan/
│   │   ├── WeekGrid.tsx
│   │   ├── MealCard.tsx
│   │   ├── BatchBadge.tsx
│   │   ├── DayMacroSummary.tsx
│   │   └── CookingTimeline.tsx
│   ├── recipes/
│   │   ├── RecipeCard.tsx
│   │   ├── IngredientList.tsx
│   │   ├── ServingsSlider.tsx
│   │   └── SubstituteButton.tsx
│   ├── shopping/
│   │   ├── ShoppingCategory.tsx
│   │   └── ShoppingItem.tsx
│   ├── tracking/
│   │   ├── MoodSelector.tsx
│   │   ├── MacroChart.tsx
│   │   └── WeightTrend.tsx
│   └── shared/
│       ├── Navigation.tsx
│       ├── MedScore.tsx
│       └── PersonToggle.tsx
│
├── lib/
│   ├── services/
│   │   ├── MealPlanGenerator.ts  # Algorytm generatora
│   │   ├── NutritionCalculator.ts
│   │   ├── ScalingEngine.ts      # Skalowanie porcji
│   │   ├── SubstitutionEngine.ts
│   │   ├── ShoppingListBuilder.ts
│   │   ├── MediterraneanScorer.ts # Mediterranean Diet Score
│   │   └── AICoach.ts
│   ├── ai/
│   │   ├── client.ts             # Anthropic SDK setup
│   │   ├── prompts/
│   │   │   ├── meal-plan.ts
│   │   │   ├── substitution.ts
│   │   │   ├── coaching.ts
│   │   │   └── recipe-creator.ts
│   │   └── parsers/
│   │       ├── diet-pdf.ts
│   │       └── plan-json.ts
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── utils/
│   │   ├── macros.ts
│   │   ├── scaling.ts
│   │   └── dates.ts
│   └── types/
│       └── index.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── data/
│   ├── diets/                    # ← PDF-y diet (git-ignored)
│   │   ├── 3000kcal_testosteron.pdf
│   │   ├── 1800kcal_wiktoria.pdf
│   │   └── ...kolejne PDF-y
│   ├── parsed/                   # Sparsowane diety jako JSON
│   └── mediterranean-rules.json  # Reguły profilu śródziemnomorskiego
│
├── scripts/
│   ├── parse-diet-pdf.ts         # PDF → JSON parser
│   ├── enrich-ingredients.ts     # Dodaj omega3, MUFA itp.
│   └── validate-med-score.ts     # Waliduj przepisy vs profil
│
├── public/
│   ├── icons/                    # PWA icons
│   └── manifest.json
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                    # SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
```

---

## 9. Profil śródziemnomorski — baza naukowa

### 9.1 Dowody naukowe

Dieta śródziemnomorska to najlepiej udokumentowany wzorzec żywieniowy. Kluczowe źródła:

- **Italian Scientific Societies & NIH (2025):** 84 rekomendacje oparte na dowodach — dieta śródziemnomorska istotnie redukuje śmiertelność ogólną i chorobowość sercowo-naczyniową (Nutrition Reviews, Jan 2025)
- **Lyon Diet Heart Study (4 lata):** 55% redukcja ryzyka zgonu, 70% mniej nawrotów zawałów
- **Meta-analiza 30 badań:** 12% niższe ryzyko udaru
- **PREDIMED Trial:** Redukcja zdarzeń sercowo-naczyniowych o 30% vs dieta niskotłuszczowa
- **PMC Review (2022):** Potwierdzone korzyści w prewencji: CVD, cukrzycy T2, zespołu metabolicznego, Alzheimera, niektórych nowotworów

### 9.2 Docelowy profil makroskładników

Na bazie przeglądu literatury (PMC, ScienceDirect, Nutrition Reviews 2025):

| Makroskładnik | Zakres | Cel dla 3000 kcal | Cel dla 1800 kcal |
|---------------|--------|--------------------|--------------------|
| Węglowodany | 40-50% | 300-375g | 180-225g |
| Tłuszcze | 30-35% | 100-117g | 60-70g |
| Białko | 15-25% | 113-188g | 68-113g |
| Błonnik | 25-35g | 35g | 28g |

Kluczowe wskaźniki:
- **MUFA:SFA ratio ≥ 2.0** (oliwa jako główny tłuszcz)
- **Omega-3 ≥ 1.6g/dzień** (ryby tłuste 3×/tydzień)
- **Błonnik ≥ 25g/dzień** (warzywa, strączki, pełne ziarna)

### 9.3 Reguły tygodniowe

| Kategoria | Częstotliwość | Przykłady |
|-----------|---------------|-----------|
| Warzywa | Codziennie, min. 5 porcji | Pomidory, szpinak, bakłażan, papryka, cukinia |
| Owoce | 2-3 porcje/dzień | Figi, winogrona, cytrusy, jabłka, granaty |
| Pełne ziarna | Przy każdym posiłku | Kasza, ryż brązowy, makaron pełnoziarnisty, chleb zakwasowy |
| Oliwa extra virgin | Codziennie, główny tłuszcz | Jako dressing, do gotowania, do chleba |
| Ryby / owoce morza | ≥ 3× / tydzień | Łosoś, sardynki, makrela, dorsz, krewetki |
| Strączki | ≥ 3× / tydzień | Ciecierzyca, soczewica, fasola, groch |
| Orzechy / nasiona | Codziennie, garść | Migdały, orzechy włoskie, siemię lniane, sezam |
| Nabiał fermentowany | Umiarkowanie | Jogurt grecki, feta, pecorino |
| Drób | 2-3× / tydzień | Kurczak, indyk |
| Jaja | 2-4 / tydzień | Jajka w śniadaniach, omlety |
| Czerwone mięso | Max 2× / miesiąc | Wołowina, jagnięcina (małe porcje) |
| Przetworzone mięso | Unikać | — |

### 9.4 Mediterranean Diet Score (MDS)

System oceny każdego jadłospisu: 0-14 punktów.

| Kryterium | 1 pkt jeśli... |
|-----------|----------------|
| Warzywa | ≥ 5 porcji/dzień |
| Owoce | ≥ 2 porcje/dzień |
| Strączki | ≥ 3×/tydzień |
| Ryby | ≥ 3×/tydzień |
| Oliwa | Codziennie jako główny tłuszcz |
| Pełne ziarna | Przy każdym głównym posiłku |
| Orzechy | Codziennie |
| Nabiał fermentowany | ≥ 3×/tydzień |
| Drób > czerwone mięso | Tak |
| Czerwone mięso | ≤ 2×/miesiąc |
| Przetworzone mięso | 0× |
| MUFA:SFA | ≥ 2.0 |
| Omega-3 | ≥ 1.6g/dzień |
| Błonnik | ≥ 25g/dzień |

**Cel: ≥ 10/14** = wysoka zgodność z profilem śródziemnomorskim.

---

## 10. System batch cooking

### 10.1 Zasady powtarzalności

| Posiłek | Powtarzalność | Domyślnie | Przykład |
|---------|---------------|-----------|----------|
| Obiad | 2-3 dni | ×3 | Gotuj w niedzielę → jedz pon-śr |
| Kolacja | 2-3 dni | ×2-3 | Zupa w niedzielę → jedz pon-wt (+ grzanki świeże) |
| Śniadanie | 3-4 dni (2 warianty) | ×3 + ×4 | Owsianka pon-śr, jajecznica czw-nd |
| Snack | Bez powtórzeń | ×1 | Orzechy, owoce, hummus |

### 10.2 Cooking days

Domyślna konfiguracja: **niedziela + środa**.

**Niedziela (główny cooking day):**
- Obiad na pon-śr (batch ×3 dni × osoby)
- Kolacja na pon-wt/śr (zupa/gulasz batch)
- Prep śniadań na pon-śr (overnight oats, pokrojone warzywa)

**Środa (mniejszy cooking day):**
- Obiad na czw-sob (batch ×3 dni × osoby)
- Kolacja na czw-sob (nowa zupa/zapiekanka)
- Prep śniadań na czw-nd

**Niedziela (posiłek dnia):**
- Obiad i kolacja gotowane świeżo (cooking day = jedz świeże)

### 10.3 Freshness tracking

| Kategoria | Max przechowywanie | Uwagi |
|-----------|-------------------|-------|
| Zupy warzywne | 3-4 dni | Lodówka w szklanym pojemniku |
| Zupy z mięsem | 2-3 dni | Lodówka, podgrzewaj do wrzenia |
| Dania z ryb | 1-2 dni | Łosoś ok 2 dni, owoce morza 1 dzień |
| Dania z kurczakiem | 3 dni | Lodówka, nie zostawiaj w temp. pokojowej |
| Strączki (gotowane) | 3-4 dni | Lodówka w zamkniętym pojemniku |
| Ryż / kasza | 2-3 dni | Schłodź szybko po ugotowaniu |
| Sałatki (bez dressingu) | 1-2 dni | Dressing osobno |

System automatycznie oznacza dzień 1/2/3 w jadłospisie i alertuje gdy posiłek powinien być zjedzony.

---

## 11. Skalowanie porcji

### 11.1 Logika obliczania

```
total_servings = (servings_person_A + servings_person_B) × batch_days

Dla każdego składnika:
  if scales_linearly:
    total_g = amount_g_per_serving × total_servings
  else:
    total_g = amount_g_per_serving × scaling_factor(total_servings)
```

### 11.2 Typy skalowania

| Typ | Formuła | Przykład składników |
|-----|---------|---------------------|
| Liniowe | `×N` | Mięso, warzywa, ziarna, nabiał, strączki |
| Pierwiastkowe | `×√N` | Olej do smażenia, masło do pieczenia |
| Logarytmiczne | `×(1 + ln(N))` | Czosnek, cebula (baza smakowa) |
| Stałe do progu | `×1 (N≤4), ×1.5 (N>4)` | Sól, pieprz, zioła suszone |
| Custom | Zdefiniowane per składnik | Ciasto (specjalne proporcje) |

### 11.3 Różne cele kaloryczne

Gdy Osoba A ma 3000 kcal, a Osoba B 1800 kcal:

- Ten sam przepis, różne porcje
- Osoba A: 1.5 serving, Osoba B: 0.9 serving (proporcjonalnie)
- Przeliczenie: `serving_ratio = user_kcal_target / recipe_kcal_per_serving`
- System wyświetla oddzielne gramaturki per osoba

---

## 12. Pipeline importu diet

### 12.1 Przebieg

```
PDF → Claude API Parser → JSON → Normalize → Enrich → Tag → Seed DB
```

### 12.2 Kroki szczegółowo

**Krok 1: Upload**
- Wrzuć PDF do `/data/diets/`
- MVP: ręcznie, Faza 2: upload w panelu admina

**Krok 2: Parse (Claude API)**
- Prompt: "Przeanalizuj tę dietę i zwróć JSON z polami: recipes[], ingredients[], substitution_rules[], meal_prep_tips[]"
- Każdy przepis: nazwa, typ, składniki z gramaturami, instrukcje, makro
- Ekstrakcja zasad zamienników (np. "oleje zamiennie: oliwa, lniany, rydzowy...")

**Krok 3: Normalize**
- Ujednolicenie nazw: "oliwa" = "oliwa z oliwek extra virgin"
- Przeliczenie na g/100g
- Mapowanie kategorii i podkategorii
- Deduplikacja: jeśli składnik już istnieje w DB → połącz

**Krok 4: Enrich**
- Dodanie brakujących mikro: omega-3, MUFA, PUFA, SFA, indeks glikemiczny
- Źródła: USDA FoodData Central API, Claude API (fallback)
- Flagi: `isMediterranean`, `isWholeGrain`, `season[]`
- `shelfLifeDays` dla batch cooking

**Krok 5: Tag batch-friendly**
- AI ocenia każdy przepis:
  - Czy dobrze się przechowuje? (zupy ✓, sałatki ✗)
  - Ile dni? (ryba max 2, zupa 3-4)
  - Czy dobrze się podgrzewa? (zapiekanki ✓, smażone ryby ✗)
- Ustawienie: `batchFriendly`, `maxStorageDays`

**Krok 6: Seed DB**
- `npx prisma db seed`
- Każdy przepis → tabela `recipes` z `sourceDiet = filename`
- Składniki → tabela `ingredients` (deduplikacja)
- Zamienniki → tabela `ingredient_substitutes`

### 12.3 Dodawanie nowej diety

```bash
# 1. Wrzuć PDF
cp nowa-dieta.pdf data/diets/

# 2. Parsuj
npx ts-node scripts/parse-diet-pdf.ts data/diets/nowa-dieta.pdf

# 3. Zweryfikuj output
cat data/parsed/nowa-dieta.json

# 4. Enrich + seed
npx ts-node scripts/enrich-ingredients.ts data/parsed/nowa-dieta.json
npx prisma db seed

# Gotowe — nowe przepisy dostępne w generatorze
```

---

## 13. AI Prompting Strategy

### 13.1 Mediterranean Meal Plan Generator

```
SYSTEM PROMPT:
Jesteś ekspertem od diety śródziemnomorskiej i planowania posiłków.
Generujesz tygodniowe jadłospisy zoptymalizowane pod batch cooking.

PROFIL MAKRO:
- Węglowodany: 40-50% (pełnoziarniste, strączki, warzywa)
- Tłuszcze: 30-35% (oliwa extra virgin jako główne źródło, MUFA:SFA ≥ 2.0)
- Białko: 15-25% (ryby ≥3×/tydz, strączki ≥3×/tydz, drób 2-3×)
- Błonnik: ≥25g/dzień

BATCH COOKING:
- Obiad: 1 przepis na 2-3 dni (musi być batch_friendly)
- Kolacja: 1 przepis na 2-3 dni (zupy, jednogarnkowe, zapiekanki)
- Śniadanie: 2 warianty na tydzień (każdy na 3-4 dni)
- Max 2 cooking days (niedziela + środa)
- Uwzględnij shelf_life składników

ZASADY ZAMIENNIKÓW Z DIET:
- Oleje zamiennie: oliwa, lniany, rydzowy, konopny, czarnuszka, wiesiołek
- Napoje roślinne zamiennie: kokosowy, owsiany, migdałowy, z orzechów laskowych
- Skrobiowe zamiennie: 1 batat = 4 ziemniaki = 60g kaszy/ryżu/makaronu
- Białko zamiennie: łosoś ↔ dorsz ↔ makrela (ta sama gramatura)

SKALOWANIE:
- Podaj gramaturki PER 1 SERVING
- Oznacz składniki nie skalujące się liniowo (olej, przyprawy)
- Oblicz makro per serving

OGRANICZENIA:
- Czerwone mięso: max 2×/miesiąc
- Przetworzone mięso: 0×
- Cukry rafinowane: unikać
- Przetworzona żywność: unikać

OUTPUT FORMAT: JSON
{
  "week": "2025-W20",
  "mediterranean_score": 12,
  "batch_groups": [...],
  "cooking_sessions": [...],
  "daily_plans": [{day, meals: [{type, recipe, batch_ref, servings}]}],
  "shopping_list": [{ingredient, total_g, category}]
}
```

### 13.2 Substitution Engine

```
SYSTEM PROMPT:
Jesteś ekspertem od zamienników w diecie śródziemnomorskiej.

KONTEKST: Tabela zamienników z bazy + zasady z diet.
INPUT: Składnik do zamiany + kontekst przepisu.
OUTPUT:
{
  "original": {name, amount_g},
  "substitute": {name, amount_g, conversion_note},
  "macro_diff": {kcal, protein, carbs, fat},
  "med_score_impact": 0 | -1 | +1,
  "reasoning": "..."
}

ZASADY:
- Priorytet: zamienniki z tej samej kategorii żywieniowej
- Utrzymaj Mediterranean Score (nie zamieniaj ryby na mięso)
- Zachowaj proporcje makro (±10%)
- Uwzględnij sezonowość
```

### 13.3 Health Coach

```
SYSTEM PROMPT:
Jesteś personalnym coachem zdrowia z wiedzą o diecie śródziemnomorskiej,
dopaminie i rutynach zdrowotnych.

KONTEKST: health_log z ostatnich 7 dni + aktywny jadłospis + rutyny.

STYL: Konkretny, wspierający, oparty na danych. Bez ogólników.
Dawaj 2-3 actionable sugestie, nie listę 10 porad.
Odnosz się do realnych danych użytkownika.

PRZYKŁAD:
"Twoja energia w czwartek i piątek spadła do 2/5 — widzę że oba dni
miałeś śniadanie bez omega-3. Spróbuj na czwartek dodać sardynki
lub siemię lniane do owsianki. W piątek widzę też krótki sen (5.5h)
— to może być główny czynnik."
```

---

## 14. Architektura systemu

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         Next.js 14 + React + Tailwind            │
│              PWA (offline-capable)                │
│                                                   │
│  Pages: Dashboard | Plan | Recipes | Shopping     │
│         Tracking | Routines | Chat | Settings     │
├─────────────────────────────────────────────────┤
│                   API LAYER                       │
│            Next.js API Routes                     │
│         Server Actions (mutations)                │
│         Zod validation + rate limiting            │
├─────────────────────────────────────────────────┤
│               BUSINESS LOGIC                      │
│                                                   │
│  MealPlanGenerator    NutritionCalculator         │
│  ScalingEngine        SubstitutionEngine          │
│  ShoppingListBuilder  MediterraneanScorer         │
│  AICoach              BatchOptimizer              │
├─────────────────────────────────────────────────┤
│                  AI ENGINE                        │
│            Claude API (Anthropic SDK)              │
│                                                   │
│  Meal Plan Generation    Substitutions            │
│  Health Coaching         Recipe Creation           │
│  Diet PDF Parsing        Knowledge Q&A            │
├─────────────────────────────────────────────────┤
│                 DATA LAYER                        │
│         Supabase (PostgreSQL) + Prisma            │
│                                                   │
│  Row Level Security per household                 │
│  Real-time subscriptions (shopping list sync)     │
│  Edge Functions (reminders, weekly reports)        │
├─────────────────────────────────────────────────┤
│               INFRASTRUCTURE                      │
│           Vercel + Supabase Cloud                  │
│                                                   │
│  Zero-config deploy    Auto-scaling               │
│  GitHub Actions CI/CD  Free tier na start          │
│  Edge network (CDN)    Automatic backups           │
└─────────────────────────────────────────────────┘
```

---

## Checklisty gotowości per faza

### ✅ Faza 1 gotowa gdy:
- [ ] Mogę zalogować się i przejść onboarding
- [ ] Baza zawiera przepisy z moich diet (min. 30 przepisów)
- [ ] Generator tworzy tygodniowy plan z batch cooking
- [ ] Plan wyświetla się w widoku tygodnia z oznaczeniem batch grup
- [ ] Lista zakupów generuje się automatycznie z planu
- [ ] Aplikacja działa jako PWA na telefonie
- [ ] Porcje skalują się na 2 osoby z różnymi kcal

### ✅ Faza 2 gotowa gdy:
- [ ] Claude API generuje jadłospisy (lepsze niż deterministyczny)
- [ ] Mogę zamienić składnik jednym klikiem
- [ ] AI chat odpowiada na pytania o dietę
- [ ] Health log działa (mood, energy, sleep, weight, water)
- [ ] Dashboard pokazuje wykresy i trendy
- [ ] Mediterranean Diet Score wyświetla się per plan

### ✅ Faza 3 gotowa gdy:
- [ ] Rutyny poranne/wieczorne działają z timerami
- [ ] Dopamine detox tracker śledzi 30-dniowe wyzwanie
- [ ] AI coach daje personalizowane porady na bazie logów
- [ ] Mogę wyeksportować jadłospis do PDF
- [ ] Mogę udostępnić listę zakupów linkiem

### ✅ Faza 4 gotowa gdy:
- [ ] Nowe składniki auto-enrichowane z USDA
- [ ] Barcode scanner działa w sklepie
- [ ] Cooking timeline z optymalizacją równoległego gotowania
- [ ] Lighthouse score > 90
- [ ] Onboarding tour dla nowych użytkowników

---

*Ostatnia aktualizacja: Luty 2026*
*Wersja: 2.0 — Mediterranean Edition*
