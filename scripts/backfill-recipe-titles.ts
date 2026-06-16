import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPLICIT_BAD_NAMES = new Set([
  '',
  'pietruszki ryzem',
  'NI RZVWYUNUMIIEIE i reel',
  'kokosowym z ryżem',
  'gotowanymi warzywami',
  'NRUTEZGR VV SUSIC PUIIUMUTUVYUTRURUSUW ylII z ryżem',
  'NIMYRZEICTOVYY E KALALAIIII i KITYRUTOAITII',
  'ryżową',
  'brokułami',
  'MMVIII GEE 2 AUIITUSQ IyUVvvQ',
  'korzeniowymi i ryżem',
  'korzeniowymi i ryżem (2)',
  'k EMW 4 Indyk z pieczonym batatem i kalarepą',
  'ziemniakami',
  'cukinią i marchewką',
  'Wołowina w sosie jogurtowo',
  'RUTESYZARTET i PAL ylIGQ',
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isBrokenTitle(name: string | null) {
  const normalized = normalizeWhitespace(name ?? '');
  if (EXPLICIT_BAD_NAMES.has(normalized)) return true;
  if (!normalized) return true;
  if (/^screenshot\b/i.test(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (/^[a-ząćęłńóśźż]/.test(normalized) && !normalized.includes(',') && words.length <= 4) {
    return true;
  }

  const letters = normalized.match(/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g) ?? [];
  const uppercase = normalized.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) ?? [];
  if (letters.length >= 8 && uppercase.length / letters.length > 0.45) return true;

  return words
    .map((word) => word.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, ''))
    .filter((word) => word.length >= 4)
    .some((word) => !/[aeiouyąęó]/i.test(word));
}

function fallbackPrefix(type: string) {
  if (type === 'breakfast') return 'Śniadanie';
  if (type === 'second_breakfast') return 'Przekąska';
  if (type === 'lunch') return 'Obiad';
  if (type === 'dinner') return 'Kolacja';
  return 'Posiłek';
}

function buildFallbackTitle(
  type: string,
  ingredients: Array<{ ingredient: { name: string; category: string } }>,
) {
  const names = ingredients
    .filter(({ ingredient }) => ingredient.category !== 'oils' && ingredient.category !== 'spices')
    .map(({ ingredient }) => normalizeWhitespace(ingredient.name))
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 3);

  const suffix = names.length > 0 ? names.join(', ') : 'wariant roboczy';
  return `${fallbackPrefix(type)}: ${suffix}`;
}

async function uniqueTitle(baseTitle: string, sourceDiet: string | null, variantKey: string, recipeId: string) {
  let candidate = baseTitle;
  let counter = 2;

  while (true) {
    const existing = await prisma.recipe.findFirst({
      where: {
        id: { not: recipeId },
        name: candidate,
        sourceDiet,
        variantKey,
      },
      select: { id: true },
    });

    if (!existing) return candidate;
    candidate = `${baseTitle} (${counter})`;
    counter += 1;
  }
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      sourceDiet: true,
      variantKey: true,
      ingredients: {
        orderBy: { amountG: 'desc' },
        select: {
          ingredient: {
            select: {
              name: true,
              category: true,
            },
          },
        },
      },
    },
  });

  const broken = recipes.filter((recipe) => isBrokenTitle(recipe.name));
  console.log(`Found ${broken.length} recipes with empty/broken titles.`);

  for (const recipe of broken) {
    const baseTitle = buildFallbackTitle(recipe.type, recipe.ingredients);
    const nextTitle = await uniqueTitle(baseTitle, recipe.sourceDiet, recipe.variantKey, recipe.id);

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { name: nextTitle },
    });

    console.log(`${recipe.name || '<empty>'} -> ${nextTitle}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
