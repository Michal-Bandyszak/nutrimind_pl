# Plan: ingredientBasis + source + nutritionVerified

## Cel
Obsługa przepisów gdzie składniki są podane na całą recepturę (ciasta, desery)
oraz rozróżnienie przepisów dietetycznych (zweryfikowane makro) od przepisów
użytkownika/internetu (brak makro).

## Kroki

### ✅ Krok 1: Schema Prisma
Zmienić model Recipe w prisma/schema.prisma:
- Dodać `ingredientBasis String @default("per-serving")` — "per-serving" | "per-whole"
- Dodać `source String @default("dietitian")` — "dietitian" | "user"
- Dodać `nutritionVerified Boolean @default(false)`
- Zamienić makro z `Float` na `Float?` (nullable)

Uruchomić: npx prisma migrate dev --name add_ingredient_basis_and_source

### ✅ Krok 2: Update seed.ts
- Istniejące przepisy z diety: source="dietitian", nutritionVerified=true, ingredientBasis="per-serving"
- Przy parsowaniu nowych: sprawdzać type ("dessert"/"ciasto") → sugerować "per-whole"

### ✅ Krok 3: lib/types/index.ts
Dodać nowe pola do typów Recipe i ShoppingItem.

### ✅ Krok 4: ShoppingListBuilder.ts
W buildShoppingList() przy agregacji składników:
- Jeśli recipe.ingredientBasis === "per-whole":
  amountG składnika jest na CAŁĄ recepturę (baseServings porcji)
  per-serving = amountG / recipe.baseServings
  total = per-serving × totalServings
- Jeśli "per-serving" (default):
  total = amountG × totalServings (jak teraz)

### ✅ Krok 5: MealPlanGenerator.ts
W zapytaniu fetchAll recipes:
- Dodać filtr: WHERE nutritionVerified = true
- Przepisy "user" bez zweryfikowanego makro nie trafiają do planu

### ✅ Krok 6: app/api/recipes/route.ts
- Dodać nowe pola w odpowiedzi
- Opcjonalny filtr query param: ?verified=true

### ✅ Krok 7: app/recipes/RecipesClient.tsx
- Badge "Zweryfikowane" (zielony check) lub "Brak makro" (szary) na karcie przepisu
- Badge "Przepis własny" (amber) vs "Dietetyk" (teal)
- Dodać filtr w UI: "Tylko zweryfikowane"

### ✅ Krok 8: AddRecipeModal (jeśli istnieje) lub obsługa JSON paste
- Przy wklejaniu JSON bez source → ustawić source="user", nutritionVerified=false
- Pokazać pytanie: "Składniki na 1 porcję czy całą formę?" jeśli type=dessert
- Dodać baseServings input dla per-whole

## Pliki do zmiany
- prisma/schema.prisma
- prisma/seed.ts
- lib/types/index.ts
- lib/services/ShoppingListBuilder.ts
- lib/services/MealPlanGenerator.ts
- app/api/recipes/route.ts
- app/recipes/RecipesClient.tsx
- app/recipes/AddRecipeModal.tsx (lub tam gdzie jest JSON paste)

## Commity
1. feat(schema): add ingredientBasis, source, nutritionVerified fields
2. feat(seed): update seeder with new recipe metadata
3. feat(services): handle per-whole ingredient scaling in ShoppingListBuilder
4. feat(generator): filter meal plan to verified recipes only
5. feat(api): expose new recipe fields in API
6. feat(ui): show recipe source and verification badges
