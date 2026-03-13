/**
 * One-time migration script:
 * 1. Fix meal types (owsianki → breakfast, koktajle → second_breakfast, etc.)
 * 2. Delete standalone side-dish recipes that have combined counterparts in the DB
 * 3. Fix malformed recipe name (koktajl leśny with ingredients in name)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── 1. Fix types ───────────────────────────────────────────────────────────

  const owsiankaNames = [
    "Budyń jaglany z musem jagodowym",
    "Czekoladowy budyń owsiany z brzoskwinią i kiwi",
    "Jesienna owsianka z borówkami",
    "Owsianka z malinami",
    "Owsianka z musem wiśniowym i kokosem",
    "Cynamonowa owsianka z duszonym jabłkiem",
    "Migdałowa owsianka nocna z malinami",
    "Nocna jaglanka z truskawkami",
  ];

  const owsiankaResult = await prisma.recipe.updateMany({
    where: { name: { in: owsiankaNames } },
    data: { type: "breakfast" },
  });
  console.log(`✅ Owsianki/jaglanki → breakfast: ${owsiankaResult.count} updated`);

  // Chia pudding → second_breakfast
  const chiaResult = await prisma.recipe.updateMany({
    where: { name: "Chia pudding kokosowy z musem jagodowym" },
    data: { type: "second_breakfast" },
  });
  console.log(`✅ Chia pudding → second_breakfast: ${chiaResult.count} updated`);

  // Chrupiąca grzanka → dinner (kolacja)
  // Use contains to avoid Unicode normalization issues with Polish chars in exact match
  const grzanka = await prisma.recipe.findFirst({
    where: { name: { contains: "grzanka z pomidorow" } },
  });
  if (grzanka) {
    await prisma.recipe.update({ where: { id: grzanka.id }, data: { type: "dinner" } });
    console.log(`✅ Chrupiąca grzanka → dinner: 1 updated`);
  } else {
    console.log(`⚠️  Chrupiąca grzanka: not found`);
  }

  // Koktajle → second_breakfast + cocktail tag
  const cocktailNames = [
    "Koktajl leśny",
    "Koktajl bananowy z awokado",
    "Koktajl owoce leśne",
    "Sezamowy koktajl polifenolowy",
    "Zielony koktajl z kiwi i szpinakiem",
    "Smoothie zielone",
    // Already second_breakfast but need cocktail tag
    "Koktajl poranny borówkowy",
    "Koktajl poranny jagodowy",
    "Koktajl potreningowy borówkowy",
    "Koktajl potreningowy jagodowy",
  ];

  const cocktailResult = await prisma.recipe.updateMany({
    where: { name: { in: cocktailNames } },
    data: { type: "second_breakfast", tags: JSON.stringify(["cocktail"]) },
  });
  console.log(`✅ Koktajle → second_breakfast + cocktail tag: ${cocktailResult.count} updated`);

  // Delete malformed koktajl entry (name has ingredients leaked in — duplicate of "Koktajl leśny")
  const badName = await prisma.recipe.findFirst({
    where: { name: { startsWith: "Koktajl leśny Napój kokosowy" } },
  });
  if (badName) {
    await prisma.mealPlanMeal.deleteMany({ where: { recipeId: badName.id } });
    await prisma.recipe.delete({ where: { id: badName.id } });
    console.log(`🗑  Deleted malformed koktajl duplicate: "${badName.name}"`);
  }

  // ── 2. Delete standalone recipes that have combined counterparts ───────────
  // Combined (correct) → [standalone main, standalone side] to delete

  const toDelete: Array<{ name: string; sourceDiet: string }> = [
    // Dieta low carb low food → combined: "Stek wołowy z chrupiącą sałatką"
    { name: "Stek wołowy",                         sourceDiet: "Dieta low carb low food" },
    { name: "Chrupiąca sałatka",                   sourceDiet: "Dieta low carb low food" },
    // Dieta low carb low food → combined: "Kurczak w ziołach z surówką z marchewki"
    { name: "Kurczak w ziołach",                   sourceDiet: "Dieta low carb low food" },
    { name: "Surówka z marchewki i pietruszki",    sourceDiet: "Dieta low carb low food" },
    // Dieta low carb low food → combined: "Dorsz w pesto bazyliowym z surówką z kalarepy"
    { name: "Dorsz w pesto bazyliowym",            sourceDiet: "Dieta low carb low food" },
    { name: "Surówka z kalarepy i ogórka",         sourceDiet: "Dieta low carb low food" },
    // dieta testosteron 2500 → combined: "Łosoś pieczony z surówką z buraków"
    { name: "Łosoś pieczony",                      sourceDiet: "dieta testosteron 2500" },
    { name: "Surówka z buraków",                   sourceDiet: "dieta testosteron 2500" },
    // dieta testosteron 2500 → combined: "Kofty z indyka z bazylią z mizerią"
    { name: "Kofty z indyka z bazylią",            sourceDiet: "dieta testosteron 2500" },
    { name: "Mizeria z ogórkiem i rzodkiewką",     sourceDiet: "dieta testosteron 2500" },
    // dieta testosteron 2500 → combined: "Grillowany łosoś z brokułami w sosie koperkowym"
    { name: "Grillowany łosoś w marynacie cytrynowo-ziołowej", sourceDiet: "dieta testosteron 2500" },
    { name: "Brokuły z sosem koperkowym",          sourceDiet: "dieta testosteron 2500" },
    // Dieta 1800 kcal → combined: "Grillowana pierś z kurczaka z frytkami z warzyw"
    { name: "Grillowana pierś z kurczaka",         sourceDiet: "Dieta 1800 kcal" },
    { name: "Frytki z warzyw",                     sourceDiet: "Dieta 1800 kcal" },
    // Dopaminowa klasyczna → combined: "Stek z nutą tymiankową i sezamem z brokułami"
    { name: "Stek z nutą tymiankową i sezamem",   sourceDiet: "Dopaminowa klasyczna" },
    { name: "Brokuły z sosem bazyliowym",          sourceDiet: "Dopaminowa klasyczna" },
    // Dopaminowa klasyczna → combined: "Stek z tuńczyka z surówką z marchewki i selera"
    { name: "Stek z tuńczyka w pietruszkowej marynacie", sourceDiet: "Dopaminowa klasyczna" },
    { name: "Surówka z marchewki i selera",        sourceDiet: "Dopaminowa klasyczna" },
  ];

  let deleted = 0;
  for (const { name, sourceDiet } of toDelete) {
    const recipes = await prisma.recipe.findMany({ where: { name, sourceDiet }, select: { id: true } });
    if (recipes.length === 0) {
      console.log(`⚠️  Not found: "${name}" (${sourceDiet})`);
      continue;
    }
    const ids = recipes.map((r) => r.id);
    // Remove MealPlanMeal refs first (no cascade on this relation)
    await prisma.mealPlanMeal.deleteMany({ where: { recipeId: { in: ids } } });
    await prisma.recipe.deleteMany({ where: { id: { in: ids } } });
    console.log(`🗑  Deleted: "${name}" (${sourceDiet})`);
    deleted += recipes.length;
  }
  console.log(`\n✅ Deleted ${deleted} standalone duplicate recipes`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = await prisma.recipe.count();
  console.log(`\n📊 Total recipes in DB: ${total}`);

  const byType = await prisma.recipe.groupBy({
    by: ["type"],
    _count: { type: true },
    orderBy: { _count: { type: "desc" } },
  });
  byType.forEach(({ type, _count }) =>
    console.log(`   ${type.padEnd(20)} ${_count.type}`)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
