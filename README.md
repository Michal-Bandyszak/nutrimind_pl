# NutriMind

Aplikacja do planowania posiłków z gotowaniem wsadowym, listą zakupów i śledzeniem resztek opakowań.

---

## Szybki start (localhost)

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Środowisko

Skopiuj `.env.example` do `.env` i wklej URL-e do bazy Postgres:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

`DATABASE_URL` powinien wskazywać pooled connection string, a `DIRECT_URL` direct connection string do migracji.

### 3. Przygotuj bazę

```bash
npm run db:deploy
npm run db:seed
```

### 4. Uruchom serwer

```bash
npm run dev
```

Aplikacja dostępna na **http://localhost:3000**

---

## Jak korzystać z aplikacji

### Plan tygodnia (`/`)

Główny widok — siatka 7 dni z posiłkami (śniadanie, drugie śniadanie, obiad, kolacja, koktajl).

**Generowanie planu:**
1. Kliknij przycisk **Generuj plan** (przycisk z ikonką ⚙️)
2. Opcjonalnie skonfiguruj grupy batch (kliknij ⚙️ żeby rozwinąć panel `BatchConfig`)
3. Kliknij **Generuj** — plan pojawi się w siatce

**BatchConfig — jak działa:**
- Każdy wiersz (śniadanie, drugie śniadanie, obiad, kolacja) ma 7 pól dla dni tygodnia
- Kliknięcie w lukę między dniem **tworzy/usuwa przerwę** między partiami
- Gruba linia = nowa partia (inny przepis), przerywana = ta sama partia
- Domyślnie: Pn-Śr jedna partia | Cz-Nd druga partia

**Drag & Drop (zamiana posiłków):**
- Chwyć kartę przepisu i upuść na inny dzień — zamieniają się całymi grupami batch
- Zamiana działa w obrębie całej grupy (np. zamiana obiadu Pn-Śr z obiadem Cz-Nd)

**Kolory batch:**
- Każda grupa batch ma swój kolor (teal, amber, sky, rose, violet, orange)
- Cyfra w prawym górnym rogu karty = dzień w grupie (1, 2, 3...)
- Dzień gotowania = świeżo gotowane (brak cyfry lub cyfra 1)

---

### Przepisy (`/recipes`)

- Wyszukiwarka po nazwie
- Filtr po typie posiłku (śniadanie, obiad, kolacja, itd.)
- Kliknięcie przepisu rozija kartę z makrami i listą składników

---

### Lista zakupów (`/shopping`)

Lista generuje się automatycznie z aktywnego planu tygodnia.

**Co zawiera:**

- **Pasek postępu** — zaznaczaj produkty jako kupione
- **Panel "Zostanie Ci X produktów"** *(amber, na górze)* — zbiorczy podgląd resztek:
  - Pokazuje wszystkie produkty, których po tygodniu zostanie więcej niż 1 szt. / 20g
  - Format: `Jajko — zostanie 7 szt. (2 × karton 10 szt.)`
  - Składany (kliknij żeby zwinąć)
- **Grupy kategorii** — Warzywa, Owoce, Białko, Nabiał, Zboża, Oleje, Przyprawy, Inne
- **Per produkt**:
  - Nazwa + ilość (np. `13 szt.` dla jajek, `350 g` dla warzyw)
  - Info o opakowaniu: `2 × karton 10 szt.`
  - Resztka inline: `(zostanie 7 szt.)`
  - Subtext: przepisy, w których jest używany

**Dane opakowań (37 produktów):**

| Produkt | Opakowanie |
|---|---|
| Jajko | karton 10 szt. |
| Pierś z kurczaka / indyka | 500g |
| Łosoś atlantycki | 300g |
| Dorsz | 400g |
| Krewetki | 300g |
| Rukola, Roszponka | 100g |
| Szpinak, młody szpinak | 200g |
| Kasza gryczana / jaglana | 400g |
| Komosa ryżowa, Makaron gryczany | 400g |
| Ryż brązowy / dziki | 500g |
| Płatki owsiane | 500g |
| Pestki dyni | 100g |
| Pestki słonecznika, Orzechy włoskie, Nasiona chia | 200g |
| Mleczko kokosowe | puszka 400ml |
| Napój kokosowy | karton 1L |
| Masło migdałowe | słoik 900g |
| Ser mozzarella | 125g |
| Ser feta | 200g |
| Olej kokosowy | słoik 450g |
| Jogurt kokosowy | kubek 125g |
| Skyr naturalny | kubek 150g |
| Passata | butelka 700g |
| Ciecierzyca / fasola z puszki | puszka 400g |
| Pomidory z puszki | puszka 400g |
| Bulion warzywny | karton 500ml |

> Rozmiary opakowań skonfigurowane w `prisma/seed.ts` → `PACKAGE_SIZES`. Można edytować i uruchomić `npm run db:seed` żeby zaktualizować bazę.

---

### Ustawienia (`/settings`)

- Zmiana docelowej kaloryczności dla Osoby A i B
- Konfiguracja domyślnego BatchConfig (zapisywana w bazie)

---

## Dodawanie nowej diety

Gdy masz nowy plik diety (format `.md` od dietetyka):

1. Wrzuć plik do głównego katalogu projektu
2. Dodaj nazwę pliku do `scripts/parse-diets.ts`:

```typescript
const DIET_FILES = [
  "Plan bazowy A.md",
  "Plan bazowy B.md",
  "nowa-dieta.md",   // ← dodaj tutaj
];
```

3. Uruchom:

```bash
npm run parse:diets   # wyciąga przepisy → data/parsed/
npm run db:seed       # upsertuje do bazy (bezpieczne, można wielokrotnie)
```

---

## Przydatne komendy

| Komenda | Co robi |
|---|---|
| `npm run dev` | Serwer developerski na :3000 |
| `npm run build` | Build produkcyjny |
| `npm run parse:diets` | Parsuje pliki diet .md → `data/parsed/combined.json` |
| `npm run db:seed` | Seeduje bazę z parsed diet (idempotent) |
| `npm run db:reset` | Pełny reset + migracja + seed |
| `npm run db:deploy` | Uruchamia gotowe migracje na bazie Postgres |
| `npm run db:studio` | Przeglądarka bazy Prisma Studio na :5555 |
| `npm run db:migrate` | Migracje schematu po zmianie `prisma/schema.prisma` |

---

## Struktura projektu

```
nutrimind/
├── app/
│   ├── (root)/             # Plan tygodnia (strona główna)
│   ├── recipes/            # Przeglądarka przepisów
│   ├── shopping/           # Lista zakupów
│   ├── settings/           # Ustawienia kalorii i batch config
│   └── api/                # API routes (meal-plans, recipes, shopping, settings)
├── components/
│   ├── plan/               # WeekGrid, MealCard, GenerateButton, BatchConfigPanel, PlanView
│   └── nav/                # Navigation (desktop sidebar + mobile bottom bar)
├── lib/
│   ├── services/
│   │   ├── MealPlanGenerator.ts   # Generowanie planu tygodnia
│   │   └── ShoppingListBuilder.ts # Lista zakupów z obliczaniem resztek
│   ├── types/index.ts      # Typy TypeScript
│   └── utils/
│       └── batchColors.ts  # System kolorów dla grup batch
├── prisma/
│   ├── schema.prisma       # Schemat bazy
│   ├── seed.ts             # Seeder (z PACKAGE_SIZES)
│   └── migrations/         # Historia migracji
├── scripts/
│   └── parse-diets.ts      # Parser diet .md → JSON
└── data/
    └── parsed/             # Sparsowane pliki JSON
```

---

## Schemat bazy danych

```
Ingredient       — nazwa, kategoria, makra/100g, dane opakowania (packageSizeG, pieceWeightG)
Recipe           — nazwa, typ, makra/porcję, batch-friendly, max dni przechowywania
RecipeIngredient — łączy Recipe ↔ Ingredient z ilością w gramach
MealPlan         — plan tygodniowy (draft/active/archived)
MealPlanMeal     — jeden slot posiłku (dzień, typ, przepis, porcje, batchGroupId)
AppSettings      — ustawienia: kcal celów, domyślny BatchConfig
HealthLog        — dziennik zdrowia (Phase 2)
```

---

## Tech Stack

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Język | TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| Baza danych | PostgreSQL (Prisma v5) |
| AI | Claude API — Anthropic SDK (Phase 2) |
| Deploy | Vercel |

## Deploy na Vercel

Instrukcja krok po kroku jest w [docs/deploy-vercel.md](docs/deploy-vercel.md).

---

## Phase 2 — planowane funkcje

- Generowanie planu przez Claude AI
- Zamiana składników (silnik substytucji)
- Chat z asystentem AI
- Dziennik zdrowia (nastrój, energia, sen, woda, waga)
- Dashboard z wykresami makr i Mediterranean Score
- Multi-user (Supabase PostgreSQL + Auth)
