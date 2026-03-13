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
  // Plan bazowy A (2800 kcal)
  // Structure: Koktajl poranny → Koktajl potreningowy → Śniadanie 10:00 → Obiad 14:00 → Kolacja 18:00
  // ══════════════════════════════════════════════════════════════════════════

  // Koktajl poranny → second_breakfast + cocktail (already correct)
  ["Koktajl poranny jagodowy",        "Plan bazowy A", "second_breakfast", ["cocktail"]],
  ["Koktajl poranny borówkowy",       "Plan bazowy A", "second_breakfast", ["cocktail"]],
  // Koktajl potreningowy → second_breakfast + cocktail (already correct)
  ["Koktajl potreningowy borówkowy",  "Plan bazowy A", "second_breakfast", ["cocktail"]],
  ["Koktajl potreningowy jagodowy",   "Plan bazowy A", "second_breakfast", ["cocktail"]],
  // Śniadanie 10:00 → breakfast
  ["Omlet z dipem ogórkowym, awokado i rukolą",  "Plan bazowy A", "breakfast", []],
  ["Jajka po benedyktyńsku z sosem chrzanowym",   "Plan bazowy A", "breakfast", []],
  ["Jajecznica z sałatką warzywną",               "Plan bazowy A", "breakfast", []],
  ["Tatar wołowy w towarzystwie roszponki",       "Plan bazowy A", "breakfast", []],
  ["Wrap z omleta z warzywami",                   "Plan bazowy A", "breakfast", []],
  ["Jajka po florencku",                          "Plan bazowy A", "breakfast", []],
  ["Kolorowa sałatka z łososiem",                 "Plan bazowy A", "breakfast", []],
  // Obiad 14:00 → lunch
  ["Stek wołowy z chrupiącą sałatką",             "Plan bazowy A", "lunch", []],
  ["Grillowany łosoś z sałatką ogórkową",         "Plan bazowy A", "lunch", []],
  ["Indyk w sosie kokosowym z dynią",              "Plan bazowy A", "lunch", []],
  ["Wołowina duszona z warzywami",                "Plan bazowy A", "lunch", []],
  ["Kurczak w ziołach z surówką z marchewki",     "Plan bazowy A", "lunch", []],
  ["Kurczak pieczony z warzywami",                "Plan bazowy A", "lunch", []],
  ["Dorsz w pesto bazyliowym z surówką z kalarepy","Plan bazowy A", "lunch", []],
  // Kolacja 18:00 → dinner
  ["Frytki z batatów, ziemniaków i marchewki z dipem bazyliowym", "Plan bazowy A", "dinner", []],
  ["Budyń jaglany z musem jagodowym",             "Plan bazowy A", "dinner", []],
  ["Bowl z warzywami",                            "Plan bazowy A", "dinner", []],
  ["Kaszotto z dynią",                            "Plan bazowy A", "dinner", []],
  ["Makaron gryczany z pesto bazyliowym",         "Plan bazowy A", "dinner", []],
  ["Sałatka makaronowa z awokado i ogórkiem",     "Plan bazowy A", "dinner", []],
  ["Lekkie risotto z jarmużem",                   "Plan bazowy A", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // Plan bazowy B
  // Structure: Śniadanie → Lunch (=second_breakfast) → Obiad → Kolacja
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Śródziemnomorska sałatka z grillowanym indykiem, szpinakiem i oliwkami", "Plan bazowy B", "breakfast", []],
  ["Muffinki jajeczne z papryką i szpinakiem",    "Plan bazowy B", "breakfast", []],
  ["Bazyliowy omlet z pomidorami",                "Plan bazowy B", "breakfast", []],
  ["Sałatka z jajkami na miękko, burakiem i awokado", "Plan bazowy B", "breakfast", []],
  ["Pasta z awokado i jajkiem",                   "Plan bazowy B", "breakfast", []],
  ["Lekka sałatka ziołowa z pieczonym łososiem",  "Plan bazowy B", "breakfast", []],
  // Lunch → second_breakfast (THIS IS THE KEY FIX!)
  ["Owsianka z musem wiśniowym i kokosem",        "Plan bazowy B", "second_breakfast", []],
  ["Zielony koktajl z kiwi i szpinakiem",         "Plan bazowy B", "second_breakfast", ["cocktail"]],
  ["Chrupiąca grzanka z pomidorową salsą",        "Plan bazowy B", "second_breakfast", []],
  ["Cynamonowa owsianka z duszonym jabłkiem",     "Plan bazowy B", "second_breakfast", []],
  ["Nocna jaglanka z truskawkami",                "Plan bazowy B", "second_breakfast", []],
  ["Koktajl owoce leśne",                        "Plan bazowy B", "second_breakfast", ["cocktail"]],
  ["Sałatka a'la tabbouleh",                      "Plan bazowy B", "second_breakfast", []],
  // Obiad → lunch
  ["Spaghetti bolognese",                         "Plan bazowy B", "lunch", []],
  ["Łosoś pieczony z surówką z buraków",          "Plan bazowy B", "lunch", []],
  ["Kofty z indyka z bazylią z mizerią",          "Plan bazowy B", "lunch", []],
  ["Curry pomidorowe ze szpinakiem",              "Plan bazowy B", "lunch", []],
  ["Potrawka z bakłażanem i papryką",             "Plan bazowy B", "lunch", []],
  ["Grillowany łosoś z brokułami w sosie koperkowym", "Plan bazowy B", "lunch", []],
  ["Frytki z batatów i warzyw z dipem bazyliowym","Plan bazowy B", "lunch", []],
  // Kolacja → dinner
  ["Sushi bowl z sosem migdałowym",               "Plan bazowy B", "dinner", []],
  ["Zupa krem z cukinii z soczewicą i grzankami", "Plan bazowy B", "dinner", ["zupa"]],
  ["Czekoladowy budyń owsiany z brzoskwinią i kiwi", "Plan bazowy B", "dinner", []],
  ["Naleśniki z konfiturą malinową",              "Plan bazowy B", "dinner", []],
  ["Makaron gryczany w sosie dyniowym z indykiem", "Plan bazowy B", "dinner", []],
  ["Krewetki z pomidorkami, pietruszką i posypką z orzechów", "Plan bazowy B", "dinner", []],
  ["Aromatyczny ryż z bakłażanem i mozzarellą",   "Plan bazowy B", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // Plan bazowy C
  // Structure: Śniadanie 7:00 → II Śniadanie 11:00 → Obiad 15:00 → Kolacja 19:00
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Gofry wytrawne z warzywami",                  "Plan bazowy C", "breakfast", []],
  ["Jajka po benedyktyńsku z sosem chrzanowym i pieczywem", "Plan bazowy C", "breakfast", []],
  ["Omlet zawijany z warzywami",                  "Plan bazowy C", "breakfast", []],
  ["Frittata ze szpinakiem",                      "Plan bazowy C", "breakfast", []],
  ["Sałatka z brokułem i jajkami",                "Plan bazowy C", "breakfast", []],
  ["Omlet bananowy z masłem migdałowym i borówkami", "Plan bazowy C", "breakfast", []],
  // II Śniadanie → second_breakfast
  ["Koktajl leśny",                               "Plan bazowy C", "second_breakfast", ["cocktail"]],
  ["Smoothie zielone",                            "Plan bazowy C", "second_breakfast", ["cocktail"]],
  ["Koktajl bananowy z awokado",                  "Plan bazowy C", "second_breakfast", ["cocktail"]],
  ["Pudding chia z owocami",                      "Plan bazowy C", "second_breakfast", []],
  // Obiad → lunch
  ["Curry z kurczakiem",                          "Plan bazowy C", "lunch", []],
  ["Zapiekany kurczak z warzywami",               "Plan bazowy C", "lunch", []],
  ["Łosoś z warzywami",                           "Plan bazowy C", "lunch", []],
  ["Grillowana pierś z kurczaka z frytkami z warzyw", "Plan bazowy C", "lunch", []],
  ["Leczo z wołowiną",                            "Plan bazowy C", "lunch", []],
  ["Warzywa gotowane na parze",                   "Plan bazowy C", "lunch", []],
  // Kolacja → dinner
  ["Kaszotto z warzywami",                        "Plan bazowy C", "dinner", []],
  ["Owsianka z malinami",                         "Plan bazowy C", "dinner", []],
  ["Wrap z warzywami",                            "Plan bazowy C", "dinner", []],
  ["Sałatka z komosą ryżową",                     "Plan bazowy C", "dinner", []],
  ["Kasza gryczana z bakłażanem",                 "Plan bazowy C", "dinner", []],
  ["Jesienna owsianka z borówkami",               "Plan bazowy C", "dinner", []],

  // ══════════════════════════════════════════════════════════════════════════
  // Plan bazowy D (~2000 kcal)
  // Structure: Śniadanie 9:00 → Lunch 12:00 (=second_breakfast) → Obiad 16:00 → Kolacja 19:00
  // ══════════════════════════════════════════════════════════════════════════

  // Śniadanie → breakfast
  ["Bowl z grillowanym kurczakiem, świeżymi warzywami i dressingiem migdałowo-kokosowym", "Plan bazowy D", "breakfast", []],
  ["Szakszuka z papryką, awokado i pestkami dyni", "Plan bazowy D", "breakfast", []],
  ["Roladki z cukinii z koperkową pastą z łososia i awokado", "Plan bazowy D", "breakfast", []],
  // Lunch → second_breakfast
  ["Sezamowy koktajl polifenolowy",               "Plan bazowy D", "second_breakfast", ["cocktail"]],
  ["Migdałowa owsianka nocna z malinami",         "Plan bazowy D", "second_breakfast", []],
  ["Chia pudding kokosowy z musem jagodowym",      "Plan bazowy D", "second_breakfast", []],
  // Obiad → lunch
  ["Stek z nutą tymiankową i sezamem z brokułami","Plan bazowy D", "lunch", []],
  ["Stek z tuńczyka z surówką z marchewki i selera", "Plan bazowy D", "lunch", []],
  ["Curry z indykiem i warzywami",                "Plan bazowy D", "lunch", []],
  // Kolacja → dinner
  ["Sałatka z kaszą gryczaną i burakiem",         "Plan bazowy D", "dinner", []],
  ["Paella z jarmużem, porem i pomidorkami koktajlowymi i pestkami dyni", "Plan bazowy D", "dinner", []],
  ["Zupa krem z brokuła i groszku",               "Plan bazowy D", "dinner", ["zupa"]],
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
