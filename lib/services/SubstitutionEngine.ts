import { prisma } from '@/lib/db/prisma';

/**
 * Substitution rules derived from diet files + category matching.
 * Each rule: category or specific ingredient → list of substitutes.
 */

type SubstitutionRule = {
  pattern: string[];      // ingredient names (lowercase) that match this rule
  category?: string;      // or match by ingredient category
  substitutes: string[];  // suggested substitute ingredient names
  note?: string;          // explanation
};

// Rules extracted from diet substitution data
const RULES: SubstitutionRule[] = [
  {
    pattern: ['oliwa z oliwek', 'oliwa', 'olej lniany', 'olej rydzowy', 'olej konopny', 'olej z czarnuszki', 'olej z wiesiołka', 'olej z pestek dyni', 'olej z orzechów włoskich'],
    substitutes: ['Oliwa z oliwek', 'Olej lniany', 'Olej rydzowy', 'Olej konopny', 'Olej z czarnuszki', 'Olej z wiesiołka', 'Olej z pestek dyni'],
    note: 'Oleje można stosować zamiennie',
  },
  {
    pattern: ['napój kokosowy', 'mleko kokosowe', 'napój owsiany', 'napój migdałowy', 'napój z orzechów laskowych'],
    substitutes: ['Napój kokosowy', 'Napój owsiany', 'Napój migdałowy', 'Napój z orzechów laskowych'],
    note: 'Napoje roślinne zamiennie — bez cukru, krótki skład',
  },
  {
    pattern: ['kasza gryczana', 'ryż brązowy', 'ryż biały', 'makaron pełnoziarnisty', 'makaron', 'kasza jaglana', 'kasza jęczmienna', 'komosa ryżowa', 'quinoa', 'bulgur'],
    substitutes: ['Kasza gryczana', 'Ryż brązowy', 'Makaron pełnoziarnisty', 'Kasza jaglana', 'Komosa ryżowa', 'Bulgur'],
    note: 'Kasze, ryże, makarony zamiennie — 50g suchego produktu',
  },
  {
    pattern: ['batat', 'bataty', 'ziemniaki', 'ziemniak'],
    substitutes: ['Batat', 'Ziemniaki'],
    note: '1 batat = 3 ziemniaki = 50g kaszy/ryżu/makaronu',
  },
  {
    pattern: ['łosoś', 'dorsz', 'makrela', 'sardynki', 'tuńczyk', 'pstrąg'],
    substitutes: ['Łosoś', 'Dorsz', 'Makrela', 'Sardynki', 'Pstrąg'],
    note: 'Ryby zamiennie — te same gramy',
  },
  {
    pattern: ['orzechy włoskie', 'migdały', 'orzechy nerkowca', 'orzechy laskowe', 'orzechy pekan', 'pestki dyni', 'pestki słonecznika'],
    substitutes: ['Orzechy włoskie', 'Migdały', 'Orzechy nerkowca', 'Orzechy laskowe', 'Pestki dyni', 'Pestki słonecznika'],
    note: 'Orzechy i pestki zamiennie — nieprażone, niesolone',
  },
  {
    pattern: ['masło orzechowe', 'masło migdałowe', 'masło z orzechów nerkowca', 'tahini'],
    substitutes: ['Masło orzechowe', 'Masło migdałowe', 'Tahini'],
    note: 'Masła orzechowe zamiennie — 100% z orzechów',
  },
  {
    pattern: ['rukola', 'roszponka', 'sałata lodowa', 'sałata', 'szpinak'],
    substitutes: ['Rukola', 'Roszponka', 'Sałata lodowa', 'Szpinak'],
    note: 'Sałaty zamiennie — do zużycia opakowania',
  },
];

export type Substitution = {
  name: string;
  inDatabase: boolean;  // czy składnik istnieje w bazie
  ingredientId?: string;
};

export type SubstitutionResult = {
  ingredientName: string;
  substitutes: Substitution[];
  note: string | null;
  categoryMatches: Substitution[];  // same-category ingredients from DB
};

/**
 * Get substitution suggestions for a given ingredient.
 */
export async function getSubstitutions(ingredientId: string): Promise<SubstitutionResult> {
  const ingredient = await prisma.ingredient.findUniqueOrThrow({
    where: { id: ingredientId },
  });

  const nameLower = ingredient.name.toLowerCase();

  // 1. Find matching rule
  const matchedRule = RULES.find((rule) =>
    rule.pattern.some((p) => nameLower.includes(p) || p.includes(nameLower))
  );

  // 2. Get same-category ingredients from DB (excluding self)
  const categoryIngredients = await prisma.ingredient.findMany({
    where: {
      category: ingredient.category,
      id: { not: ingredientId },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 10,
  });

  // 3. If we have a rule, check which substitutes exist in DB
  let substitutes: Substitution[] = [];
  let note: string | null = null;

  if (matchedRule) {
    note = matchedRule.note ?? null;
    const subNames = matchedRule.substitutes.filter(
      (s) => s.toLowerCase() !== nameLower
    );

    // Check which exist in DB
    const dbIngredients = await prisma.ingredient.findMany({
      where: {
        name: { in: subNames },
      },
      select: { id: true, name: true },
    });

    const dbMap = new Map(dbIngredients.map((i) => [i.name.toLowerCase(), i]));

    substitutes = subNames.map((name) => {
      const dbMatch = dbMap.get(name.toLowerCase());
      return {
        name,
        inDatabase: !!dbMatch,
        ingredientId: dbMatch?.id,
      };
    });
  }

  const categoryMatches: Substitution[] = categoryIngredients
    .filter((ci) => !substitutes.some((s) => s.ingredientId === ci.id))
    .map((ci) => ({
      name: ci.name,
      inDatabase: true,
      ingredientId: ci.id,
    }));

  return {
    ingredientName: ingredient.name,
    substitutes,
    note,
    categoryMatches,
  };
}
