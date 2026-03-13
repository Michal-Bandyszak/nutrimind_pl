/**
 * Comprehensive type fix based on thorough diet file analysis.
 *
 * Mapping from diet files to our DB types:
 *   Koktajl poranny / Koktajl potreningowy → second_breakfast + cocktail tag
 *   Śniadanie → breakfast
 *   Lunch / II Śniadanie → second_breakfast  (KEY insight!)
 *   Obiad → lunch
 *   Kolacja → dinner
 *
 * Also fixes:
 *   - "Warzywa gotowane na parze" standalone → should be part of Obiad, not standalone
 *   - Pudding chia z owocami → second_breakfast (II Śniadanie in Dieta 1800)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Complete recipe → correct type mapping from diet file analysis
// Format: [name, sourceDiet, correctType, tags]
const CORRECT_MAPPINGS: Array<[string, string, string, string[]]> = [
  // ══════════════════════════════════════════════════════════════════════════
  // Dieta low carb low food (2800 kcal)
  // Structure: Koktajl poranny → Koktajl potreningowy → Śniadanie 10:00 → Obiad 14:00 → Kolacja 18:00
  // ══════════════════════════════════════════════════════════════════════════

  // Koktajl poranny → second_breakfast + cocktail (already correct)
  ["Koktajl poranny jagodowy",        "Dieta low carb low food", "second_breakfast", ["cocktail"]],
  ["Koktajl poranny borówkowy",       "Dieta low carb low food", "second_breakfast", ["cocktail"]],
  // Koktajl potreningowy → second_breakfast + cocktail (already correct)
  ["Koktajl potreningowy borówkowy",  "Dieta low carb low food", "second_breakfast", ["cocktail"]],
  ["Koktajl potreningowy jagodowy",   "Dieta low carb low food", "second_breakfast", ["cocktail"]],
  // Śniadanie 10:00 → breakfast
  ["Omlet z dipem ogórkowym, awokado i rukolą",  "Dieta low carb low food", "breakfast", []],
  ["Jajka po benedyktyńsku z sosem chrzanowym",   "Dieta low carb low food", "breakfast", []],
  ["Jajecznica z sałatką warzywną",               "Dieta low carb low food", "breakfast", []],
  ["Tatar wołowy w towarzystwie roszponki",       "Dieta low carb low food", "breakfast", []],
  ["Wrap z omleta z warzywami",                   "Dieta low carb low food", "breakfast", []],
  ["Jajka po florencku",                          "Dieta low carb low food", "breakfast", []],
  ["Kolorowa sałatka z łososiem",                 "Dieta low carb low food", "breakfast", []],
  // Obiad 14:00 → lunch
  ["Stek wołowy z chrupiącą sałatką",             "Dieta low carb low food", "lunch", []],
  ["Grillowany łosoś z sałatką ogórkową",         "Dieta low carb low food", "lunch", []],
  ["Indyk w sosie kokosowym z dynią",              "Dieta low carb low food", "lunch", []],
  ["Wołowina duszona z warzywami",                "Dieta low carb low food", "lunch", []],
  ["Kurczak w ziołach z surówką z marchewki",     "Dieta low carb low food", "lunch", []],
  ["Kurczak pieczony z warzywami",                "Dieta low carb low food", "lunch", []],
  ["Dorsz w pesto bazyliowym z surówką z kalarepy","Dieta low carb low food", "lunch", []],
  // Kolacja 18:00 → dinner
  ["Frytki z batatów, ziemniaków i marchewki z dipem bazyliowym", "Dieta low carb low food", "dinner", []],
  ["Budyń jaglany z musem jagodowym",             "Dieta low carb low food", "dinner", []],
  ["Bowl z warzywami",                            "Dieta low carb low food", "dinner", []],
  ["Kaszotto z dynią",                            "Dieta low carb low food", "dinner", []],
  ["Makaron gryczany z pesto bazyliowym",         "Dieta low carb low food", "dinner", []],
  ["Sałatka makaronowa z awokado i ogórkiem",     "Dieta low carb low food", "dinner", []],
  ["Lekkie risotto z jarmużem",                   "Dieta low carb low food", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // dieta testosteron 2500
  // Structure: Śniadanie → Lunch (=second_breakfast) → Obiad → Kolacja
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Śródziemnomorska sałatka z grillowanym indykiem, szpinakiem i oliwkami", "dieta testosteron 2500", "breakfast", []],
  ["Muffinki jajeczne z papryką i szpinakiem",    "dieta testosteron 2500", "breakfast", []],
  ["Bazyliowy omlet z pomidorami",                "dieta testosteron 2500", "breakfast", []],
  ["Sałatka z jajkami na miękko, burakiem i awokado", "dieta testosteron 2500", "breakfast", []],
  ["Pasta z awokado i jajkiem",                   "dieta testosteron 2500", "breakfast", []],
  ["Lekka sałatka ziołowa z pieczonym łososiem",  "dieta testosteron 2500", "breakfast", []],
  // Lunch → second_breakfast (THIS IS THE KEY FIX!)
  ["Owsianka z musem wiśniowym i kokosem",        "dieta testosteron 2500", "second_breakfast", []],
  ["Zielony koktajl z kiwi i szpinakiem",         "dieta testosteron 2500", "second_breakfast", ["cocktail"]],
  ["Chrupiąca grzanka z pomidorową salsą",        "dieta testosteron 2500", "second_breakfast", []],
  ["Cynamonowa owsianka z duszonym jabłkiem",     "dieta testosteron 2500", "second_breakfast", []],
  ["Nocna jaglanka z truskawkami",                "dieta testosteron 2500", "second_breakfast", []],
  ["Koktajl owoce leśne",                        "dieta testosteron 2500", "second_breakfast", ["cocktail"]],
  ["Sałatka a'la tabbouleh",                      "dieta testosteron 2500", "second_breakfast", []],
  // Obiad → lunch
  ["Spaghetti bolognese",                         "dieta testosteron 2500", "lunch", []],
  ["Łosoś pieczony z surówką z buraków",          "dieta testosteron 2500", "lunch", []],
  ["Kofty z indyka z bazylią z mizerią",          "dieta testosteron 2500", "lunch", []],
  ["Curry pomidorowe ze szpinakiem",              "dieta testosteron 2500", "lunch", []],
  ["Potrawka z bakłażanem i papryką",             "dieta testosteron 2500", "lunch", []],
  ["Grillowany łosoś z brokułami w sosie koperkowym", "dieta testosteron 2500", "lunch", []],
  ["Frytki z batatów i warzyw z dipem bazyliowym","dieta testosteron 2500", "lunch", []],
  // Kolacja → dinner
  ["Sushi bowl z sosem migdałowym",               "dieta testosteron 2500", "dinner", []],
  ["Zupa krem z cukinii z soczewicą i grzankami", "dieta testosteron 2500", "dinner", ["zupa"]],
  ["Czekoladowy budyń owsiany z brzoskwinią i kiwi", "dieta testosteron 2500", "dinner", []],
  ["Naleśniki z konfiturą malinową",              "dieta testosteron 2500", "dinner", []],
  ["Makaron gryczany w sosie dyniowym z indykiem", "dieta testosteron 2500", "dinner", []],
  ["Krewetki z pomidorkami, pietruszką i posypką z orzechów", "dieta testosteron 2500", "dinner", []],
  ["Aromatyczny ryż z bakłażanem i mozzarellą",   "dieta testosteron 2500", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // Dieta 1800 kcal
  // Structure: Śniadanie 7:00 → II Śniadanie 11:00 → Obiad 15:00 → Kolacja 19:00
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Gofry wytrawne z warzywami",                  "Dieta 1800 kcal", "breakfast", []],
  ["Jajka po benedyktyńsku z sosem chrzanowym i pieczywem", "Dieta 1800 kcal", "breakfast", []],
  ["Omlet zawijany z warzywami",                  "Dieta 1800 kcal", "breakfast", []],
  ["Frittata ze szpinakiem",                      "Dieta 1800 kcal", "breakfast", []],
  ["Sałatka z brokułem i jajkami",                "Dieta 1800 kcal", "breakfast", []],
  ["Omlet bananowy z masłem migdałowym i borówkami", "Dieta 1800 kcal", "breakfast", []],
  // II Śniadanie → second_breakfast
  ["Koktajl leśny",                               "Dieta 1800 kcal", "second_breakfast", ["cocktail"]],
  ["Smoothie zielone",                            "Dieta 1800 kcal", "second_breakfast", ["cocktail"]],
  ["Koktajl bananowy z awokado",                  "Dieta 1800 kcal", "second_breakfast", ["cocktail"]],
  ["Pudding chia z owocami",                      "Dieta 1800 kcal", "second_breakfast", []],
  // Obiad → lunch
  ["Curry z kurczakiem",                          "Dieta 1800 kcal", "lunch", []],
  ["Zapiekany kurczak z warzywami",               "Dieta 1800 kcal", "lunch", []],
  ["Łosoś z warzywami",                           "Dieta 1800 kcal", "lunch", []],
  ["Grillowana pierś z kurczaka z frytkami z warzyw", "Dieta 1800 kcal", "lunch", []],
  ["Leczo z wołowiną",                            "Dieta 1800 kcal", "lunch", []],
  ["Warzywa gotowane na parze",                   "Dieta 1800 kcal", "lunch", []],
  // Kolacja → dinner
  ["Kaszotto z warzywami",                        "Dieta 1800 kcal", "dinner", []],
  ["Owsianka z malinami",                         "Dieta 1800 kcal", "dinner", []],
  ["Wrap z warzywami",                            "Dieta 1800 kcal", "dinner", []],
  ["Sałatka z komosą ryżową",                     "Dieta 1800 kcal", "dinner", []],
  ["Kasza gryczana z bakłażanem",                 "Dieta 1800 kcal", "dinner", []],
  ["Jesienna owsianka z borówkami",               "Dieta 1800 kcal", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // Dopaminowa klasyczna (~2000 kcal)
  // Structure: Śniadanie 9:00 → Lunch 12:00 (=second_breakfast) → Obiad 16:00 → Kolacja 19:00
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Bowl z grillowanym kurczakiem, świeżymi warzywami i dressingiem migdałowo-kokosowym", "Dopaminowa klasyczna", "breakfast", []],
  ["Szakszuka z papryką, awokado i pestkami dyni", "Dopaminowa klasyczna", "breakfast", []],
  ["Roladki z cukinii z koperkową pastą z łososia i awokado", "Dopaminowa klasyczna", "breakfast", []],
  // Lunch → second_breakfast
  ["Sezamowy koktajl polifenolowy",               "Dopaminowa klasyczna", "second_breakfast", ["cocktail"]],
  ["Migdałowa owsianka nocna z malinami",         "Dopaminowa klasyczna", "second_breakfast", []],
  ["Chia pudding kokosowy z musem jagodowym",      "Dopaminowa klasyczna", "second_breakfast", []],
  // Obiad → lunch
  ["Stek z nutą tymiankową i sezamem z brokułami","Dopaminowa klasyczna", "lunch", []],
  ["Stek z tuńczyka z surówką z marchewki i selera", "Dopaminowa klasyczna", "lunch", []],
  ["Curry z indykiem i warzywami",                "Dopaminowa klasyczna", "lunch", []],
  // Kolacja → dinner
  ["Sałatka z kaszą gryczaną i burakiem",         "Dopaminowa klasyczna", "dinner", []],
  ["Paella z jarmużem, porem i pomidorkami koktajlowymi i pestkami dyni", "Dopaminowa klasyczna", "dinner", []],
  ["Zupa krem z brokuła i groszku",               "Dopaminowa klasyczna", "dinner", ["zupa"]],
];

async function main() {
  console.log("═══ Comprehensive Recipe Type Fix v2 ═══\n");

  let updated = 0;
  let notFound = 0;
  let alreadyCorrect = 0;

  for (const [name, sourceDiet, correctType, tags] of CORRECT_MAPPINGS) {
    // Use findFirst with contains for Polish character safety
    const recipe = await prisma.recipe.findFirst({
      where: { name, sourceDiet },
    });

    if (!recipe) {
      // Try contains fallback for Polish chars
      const shortName = name.substring(0, Math.min(name.length, 20));
      const fallback = await prisma.recipe.findFirst({
        where: { name: { contains: shortName }, sourceDiet },
      });
      if (fallback) {
        const currentTags = JSON.parse(fallback.tags || "[]");
        if (fallback.type === correctType && JSON.stringify(currentTags) === JSON.stringify(tags)) {
          alreadyCorrect++;
          continue;
        }
        await prisma.recipe.update({
          where: { id: fallback.id },
          data: { type: correctType, tags: JSON.stringify(tags) },
        });
        console.log(`✅ "${fallback.name}" (${sourceDiet}): ${fallback.type} → ${correctType} [contains match]`);
        updated++;
      } else {
        console.log(`⚠️  NOT FOUND: "${name}" (${sourceDiet})`);
        notFound++;
      }
      continue;
    }

    const currentTags = JSON.parse(recipe.tags || "[]");
    if (recipe.type === correctType && JSON.stringify(currentTags) === JSON.stringify(tags)) {
      alreadyCorrect++;
      continue;
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { type: correctType, tags: JSON.stringify(tags) },
    });
    console.log(`✅ "${name}" (${sourceDiet}): ${recipe.type} → ${correctType}${tags.length ? ` +tags:${tags}` : ""}`);
    updated++;
  }

  console.log(`\n── Summary ──`);
  console.log(`Updated: ${updated}`);
  console.log(`Already correct: ${alreadyCorrect}`);
  console.log(`Not found: ${notFound}`);

  // ── Final distribution ──
  const total = await prisma.recipe.count();
  console.log(`\n📊 Total recipes: ${total}`);

  const byType = await prisma.recipe.groupBy({
    by: ["type"],
    _count: { type: true },
    orderBy: { _count: { type: "desc" } },
  });
  console.log("\nType distribution:");
  byType.forEach(({ type, _count }) =>
    console.log(`   ${type.padEnd(20)} ${_count.type}`)
  );

  // Show cocktail-tagged recipes
  const cocktails = await prisma.recipe.findMany({
    where: { tags: { contains: "cocktail" } },
    select: { name: true, type: true, tags: true },
  });
  console.log(`\nCocktail-tagged recipes (${cocktails.length}):`);
  cocktails.forEach((r) => console.log(`   ${r.name} [${r.type}]`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
