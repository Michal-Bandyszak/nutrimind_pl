type OcrRecipeNameFix = {
  canonicalName: string;
  legacyNames: string[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function stripOcrMealLabel(name: string) {
  return normalizeWhitespace(name.replace(/^(obiad|kolacja|lunch)\s*:\s*/i, ''));
}

export const OCR_RECIPE_NAME_FIXES: OcrRecipeNameFix[] = [
  {
    canonicalName: 'Krewetki z pomidorkami, ryżem brązowym i orzechami',
    legacyNames: ['Olej z awokado, Krewetki, Papryka słodka'],
  },
  {
    canonicalName: 'Sałatka makaronowa z krewetkami i pesto bazyliowym',
    legacyNames: ['Olej z awokado, Krewetki, Pomidory koktajlowe'],
  },
  {
    canonicalName: 'Białkowy koktajl orzechowo-cynamonowy z truskawkami',
    legacyNames: ['Białkowy kotajl orzechowo-cynamonowy z truskawkami'],
  },
  {
    canonicalName: 'Koktajl truskawkowo-migdałowy na kefirze',
    legacyNames: ['Koktajl truskawkowo-migdatowy na kefirze'],
  },
  {
    canonicalName: 'Makaron ryżowy z krewetkami w sosie curry-kokosowym',
    legacyNames: [
      'Cukinia, Olej z awokado, Papryka czerwona',
      'Krewetki, Cukinia, Passata pomidorowa',
    ],
  },
  {
    canonicalName: 'Pieczony dorsz z kaszą jaglaną i warzywami',
    legacyNames: [
      'Dorsz, Sok z cytryny, Papryka czerwona',
      'Dorsz, Kasza jaglana, Papryka czerwona',
    ],
  },
  {
    canonicalName: 'Krem z batata i papryki z krewetkami',
    legacyNames: [
      'Papryka czerwona, Marchew, Batat',
      'Bulion warzywny, Krewetki, Batat',
    ],
  },
  {
    canonicalName: 'Kurczak curry z ryżem brązowym i warzywami',
    legacyNames: ['Olej z awokado, Pierś z kurczaka, Marchew'],
  },
  {
    canonicalName: 'Szaszłyki z kurczaka z frytkami z batata i fasolką',
    legacyNames: ['Pierś z kurczaka, Olej z awokado, Sok z cytryny'],
  },
  {
    canonicalName: 'Kurczak w sosie pomidorowo-kokosowym z ryżem basmati',
    legacyNames: ['Pierś z kurczaka, Olej z awokado, Pomidory krojone w puszce'],
  },
  {
    canonicalName: 'Grillowana pierś z indyka z batatami, brokułem i sosem koperkowym',
    legacyNames: ['Pierś z indyka, Olej z awokado, Batat'],
  },
  {
    canonicalName: 'Kurczak zapiekany na warzywach z komosą ryżową',
    legacyNames: [
      'Pomidor, Cukinia, Papryka czerwona',
      'Pierś z kurczaka, Pomidor, Komosa ryżowa',
    ],
  },
  {
    canonicalName: 'Wołowina z pieczoną dynią, cukinią i komosą ryżową',
    legacyNames: ['Polędwica wołowa, Komosa ryżowa, Olej z awokado'],
  },
  {
    canonicalName: 'Pieczona wołowina z ziemniakami, brokułem i marchewką',
    legacyNames: ['Polędwica wołowa, Olej z awokado, Ziemniak'],
  },
  {
    canonicalName: 'Pieczone udko z kurczaka z dynią i komosą ryżową',
    legacyNames: ['Kurczak udko, Majeranek suszony, Stodka papryka przyprawa'],
  },
  {
    canonicalName: 'Owsianka czekoladowa z bananem, wiśniami i odżywką białkową',
    legacyNames: ['Owsianka czekoladowa z bananem wiśniami i odzywkg białkową'],
  },
  {
    canonicalName: 'Krem z warzyw korzeniowych z indykiem i ryżem basmati',
    legacyNames: [
      'Pierś z indyka, Ryż basmati, Marchew',
      'Pierś z indyka, Ryż basmati, Marchew (2)',
    ],
  },
  {
    canonicalName: 'Pieczony indyk z batatem i kalarepą',
    legacyNames: ['Pierś z indyka, Batat, Kalarepa'],
  },
  {
    canonicalName: 'Kurczak w jogurtowej marynacie z ziemniakami i sałatką',
    legacyNames: ['Pierś z kurczaka, Gałka muszkatołowa mielona, Papryka słodka'],
  },
  {
    canonicalName: 'Pulpety drobiowe z sałatką z pomidorów i ogórków oraz ryżem',
    legacyNames: ['Pulpety drobiowe z saratką z pomidorów i ogórków oraz ryżem'],
  },
  {
    canonicalName: 'Polędwiczka z indyka w sosie koperkowym z kaszą gryczaną',
    legacyNames: [
      'Polędwica z indyka, Bulion warzywny, Olej z awokado',
      'Bulion warzywny, Polędwica z indyka, Fasolka szparagowa',
    ],
  },
  {
    canonicalName: 'Wołowina duszona z warzywami i ryżem brązowym',
    legacyNames: ['Polędwica wołowa, Marchew, Cukinia'],
  },
  {
    canonicalName: 'Wołowe curry z kaszą jaglaną i warzywami',
    legacyNames: [
      'Polędwica wołowa, Kasza jaglana, Cukinia',
      'Polędwica wołowa, Kalarepa, Kasza jaglana',
    ],
  },
  {
    canonicalName: 'Wołowina w sosie jogurtowo-rozmarynowym z pieczonymi ziemniakami i kalarepą',
    legacyNames: ['Polędwica wołowa, Ziemniak, Olej z awokado'],
  },
  {
    canonicalName: 'Kurczak w sosie paprykowo-kokosowym z ryżem brązowym',
    legacyNames: [
      'Pierś z kurczaka, Kolendra liście suszone, Stodka papryka przyprawa',
      'Pierś z kurczaka, Papryka czerwona, Passata pomidorowa',
    ],
  },
  {
    canonicalName: 'Stek wołowy z frytkami z batata i sałatką curry',
    legacyNames: [
      'Polędwica wołowa, Olej z awokado, Batat',
      'Batat, Polędwica wołowa, Ogórek świeży',
    ],
  },
  {
    canonicalName: 'Zupa z indykiem, dynią i makaronem gryczanym',
    legacyNames: [
      'Pierś z indyka, Pomidor, Dynia',
      'Bulion warzywny, Pierś z indyka, Dynia',
    ],
  },
  {
    canonicalName: 'Makaron gryczany z indykiem w sosie z czerwonej papryki',
    legacyNames: ['Makaron gryczany, Pierś z indyka, Olej z awokado'],
  },
  {
    canonicalName: 'Krem z marchwi i pietruszki z indykiem',
    legacyNames: [
      'Marchew, Pietruszka (korzeń), Pierś z indyka',
      'Bulion warzywny, Marchew, Pierś z indyka',
    ],
  },
  {
    canonicalName: 'Krem z batata i marchewki z indykiem',
    legacyNames: [
      'Pierś z indyka, Batat, Marchew',
      'Bulion warzywny, Batat, Pierś z indyka',
    ],
  },
];

const legacyToCanonical = new Map<string, string>();
const canonicalToLegacy = new Map<string, string[]>();

for (const fix of OCR_RECIPE_NAME_FIXES) {
  const canonicalKey = normalizeWhitespace(fix.canonicalName);
  const normalizedLegacyNames = fix.legacyNames.map((legacyName) => stripOcrMealLabel(legacyName));

  canonicalToLegacy.set(canonicalKey, normalizedLegacyNames);
  for (const legacyName of normalizedLegacyNames) {
    legacyToCanonical.set(legacyName, fix.canonicalName);
  }
}

export function getCanonicalOcrRecipeName(name: string) {
  const normalized = normalizeWhitespace(name);
  return legacyToCanonical.get(stripOcrMealLabel(normalized)) ?? normalized;
}

export function getLegacyOcrRecipeNames(canonicalName: string) {
  return canonicalToLegacy.get(normalizeWhitespace(canonicalName)) ?? [];
}

export function isLegacyOcrRecipeName(name: string) {
  return legacyToCanonical.has(stripOcrMealLabel(name));
}
