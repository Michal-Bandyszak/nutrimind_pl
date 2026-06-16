/**
 * Parses OCR Import markdown exports into seedable recipe JSON.
 *
 * Inputs:
 * - /Users/michalbandyszak/Documents/repos/OCR Import/output/lunch.md
 * - /Users/michalbandyszak/Documents/repos/OCR Import/output/Obiad.md
 * - /Users/michalbandyszak/Documents/repos/OCR Import/output/Kolacja.md
 *
 * Output:
 * - data/curated/ocr-diety-recipes.json
 */

import fs from 'fs';
import path from 'path';

type ParsedIngredient = {
  name: string;
  amountG: number;
  displayText: string;
  category: string;
};

type ParsedRecipe = {
  name: string;
  type: 'second_breakfast' | 'lunch' | 'dinner';
  prepTimeMin: null;
  cookTimeMin: null;
  batchFriendly: boolean;
  maxStorageDays: number;
  kcalPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: null;
  baseServings: 1;
  ingredientBasis: 'per-serving';
  source: 'dietitian';
  nutritionVerified: boolean;
  sourceDiet: string;
  tags: string[];
  ingredients: ParsedIngredient[];
  instructions: string[];
};

const ROOT = path.join(__dirname, '..');
const OCR_ROOT = '/Users/michalbandyszak/Documents/repos/OCR Import/output';
const OUTPUT_PATH = path.join(ROOT, 'data', 'curated', 'ocr-diety-recipes.json');

const INPUTS = [
  {
    inputPath: path.join(OCR_ROOT, 'lunch.md'),
    type: 'second_breakfast' as const,
    sourceDiet: 'Import OCR Lunch A',
    tag: 'ocr-lunch',
  },
  {
    inputPath: path.join(OCR_ROOT, 'Obiad.md'),
    type: 'lunch' as const,
    sourceDiet: 'Import OCR Obiad A',
    tag: 'ocr-obiad',
  },
  {
    inputPath: path.join(OCR_ROOT, 'Kolacja.md'),
    type: 'dinner' as const,
    sourceDiet: 'Import OCR Kolacja A',
    tag: 'ocr-kolacja',
  },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetables: [
    'bakłażan', 'brokuł', 'burak', 'cukinia', 'dynia', 'fasolka', 'figa', 'kiełki',
    'marchew', 'ogórek', 'oliwki', 'papryka', 'passata', 'pieczarki', 'pietruszka',
    'pomidor', 'roszponka', 'rukola', 'rzodkiewka', 'sałata', 'szczypiorek', 'szpinak',
  ],
  fruits: [
    'awokado', 'banan', 'borówki', 'brzoskwinia', 'figa', 'gruszka', 'jagody',
    'kiwi', 'maliny', 'morele', 'pomarańcza', 'sok z cytryny', 'truskawki',
  ],
  grains: [
    'chleb', 'granola', 'kasza', 'komosa', 'makaron', 'płatki', 'ryż', 'tortilla',
  ],
  protein: [
    'ciecierzyca', 'dorsz', 'indyk', 'jajko', 'kurczak', 'krewetki', 'łosoś',
    'mięso mielone', 'odżywka białkowa', 'polędwica', 'serek wiejski', 'skyr',
    'tahini', 'tuńczyk',
  ],
  dairy: [
    'jogurt', 'mozzarella', 'mleczko kokosowe', 'napój kokosowy', 'ricotta', 'ser',
    'skyr', 'serek wiejski', 'twaróg',
  ],
  oils: ['olej', 'oliwa', 'pasta kokosowa', 'pesto'],
  nuts: ['migdały', 'nasiona', 'orzechy', 'pestki', 'sezam'],
  spices: [
    'bazylia', 'curry', 'imbir', 'kardamon', 'kminek', 'koper', 'kumin', 'kurkuma',
    'natka', 'oregano', 'papryka', 'pieprz', 'sól', 'stewia', 'tymianek', 'zioła',
  ],
};

const CATEGORY_OVERRIDES: Record<string, string> = {
  'Awokado': 'fruits',
  'Bulion warzywny': 'other',
  'Figa': 'fruits',
  'Granola': 'grains',
  'Passata pomidorowa': 'vegetables',
  'Pesto bazyliowe': 'oils',
  'Pomidory suszone': 'vegetables',
  'Serek wiejski': 'dairy',
  'Tahini masło sezamowe': 'nuts',
};

const INGREDIENT_NAME_OVERRIDES: Record<string, string> = {
  'algi nori': 'Algi nori',
  'awokado': 'Awokado',
  'bakłażan': 'Bakłażan',
  'banan': 'Banan',
  'bazylia świeża': 'Bazylia świeża',
  'bazylia swieza': 'Bazylia świeża',
  'bazylia suszona': 'Bazylia suszona',
  'borówki amerykańskie': 'Borówki amerykańskie',
  'brokuł': 'Brokuł',
  'brzoskwinia': 'Brzoskwinia',
  'bulion warzywny': 'Bulion warzywny',
  'chleb żytni': 'Chleb żytni',
  'ciecierzyca ugotowana': 'Ciecierzyca ugotowana',
  'cukinia': 'Cukinia',
  'curry przyprawa': 'Curry',
  'dorsz': 'Dorsz',
  'dynia': 'Dynia',
  'fasolka szparagowa': 'Fasolka szparagowa',
  'figa': 'Figa',
  'granola': 'Granola',
  'gruszka': 'Gruszka',
  'imbir mielony': 'Imbir mielony',
  'indyk pierś': 'Pierś z indyka',
  'jajko kurze': 'Jajko',
  'jogurt naturalny 2%': 'Jogurt naturalny 2%',
  'kardamon': 'Kardamon',
  'kardamon mielony': 'Kardamon mielony',
  'kasza gryczana niepalona': 'Kasza gryczana',
  'kasza jaglana': 'Kasza jaglana',
  'kiełki lucerny': 'Kiełki lucerny',
  'koper świeży': 'Koper świeży',
  'komosa ryżowa (quinoa)': 'Komosa ryżowa',
  'kminek': 'Kminek',
  'kumin w proszku (kmin rzymski)': 'Kumin',
  'kurczak pierś': 'Pierś z kurczaka',
  'kurkuma mielona': 'Kurkuma mielona',
  'łosoś atlantycki': 'Łosoś atlantycki',
  'łosoś pieczony (fjord fiskursson)': 'Łosoś pieczony',
  'makaron gryczany': 'Makaron gryczany',
  'marchew': 'Marchew',
  'mięso mielone z indyka': 'Mięso mielone z indyka',
  'mleczko kokosowe 19%': 'Mleczko kokosowe',
  'morele': 'Morele',
  'natka pietruszki': 'Natka pietruszki',
  'nasiona słonecznika': 'Pestki słonecznika',
  'napój kokosowy': 'Napój kokosowy',
  'odżywka białkowa': 'Odżywka białkowa',
  'ogórek': 'Ogórek świeży',
  'olej iniany': 'Olej lniany',
  'olej z awokado': 'Olej z awokado',
  'oliwki zielone marynowane': 'Oliwki zielone marynowane',
  'oregano suszone': 'Oregano suszone',
  'orzechy włoskie': 'Orzechy włoskie',
  'papryka czerwona': 'Papryka czerwona',
  'passata pomidorowa': 'Passata pomidorowa',
  'pasta kokosowa': 'Pasta kokosowa',
  'pestki dyni': 'Pestki dyni',
  'pieczarki': 'Pieczarki',
  'pieprz czarny': 'Pieprz czarny',
  'pietruszka korzeń': 'Pietruszka (korzeń)',
  'polędwica wołowa': 'Polędwica wołowa',
  'pomidor czerwony': 'Pomidor',
  'pomidory koktajlowe': 'Pomidory koktajlowe',
  'pomidory suszone': 'Pomidory suszone',
  'roszponka': 'Roszponka',
  'rukola': 'Rukola',
  'ryż basmati': 'Ryż basmati',
  'ryż brązowy': 'Ryż brązowy',
  'ryz brazowy': 'Ryż brązowy',
  'rzodkiewka': 'Rzodkiewka',
  'sezam': 'Sezam',
  'ser mozzarella': 'Ser mozzarella',
  'ser ricotta': 'Ser ricotta',
  'skyr naturalny': 'Skyr naturalny',
  'słodka papryka przyprawa': 'Papryka słodka',
  'sok z cytryny': 'Sok z cytryny',
  'sól': 'Sól',
  'stewia': 'Stewia',
  'szczypiorek': 'Szczypiorek',
  'szpinak': 'Szpinak',
  'serek wiejski': 'Serek wiejski',
  'tahini masło sezamowe': 'Tahini masło sezamowe',
  'tortilla petnoziarnista': 'Tortilla pełnoziarnista',
  'tortilla pełnoziarnista': 'Tortilla pełnoziarnista',
  'truskawki': 'Truskawki',
  'twaróg półtłusty': 'Twaróg półtłusty',
  'zioła prowansalskie przyprawa': 'Zioła prowansalskie',
  'ziemniaki': 'Ziemniak',
};

const TITLE_TEXT_OVERRIDES: Record<string, string> = {
  'Białkowy kotajl orzechowo-cynamonowy z truskawkami': 'Białkowy koktajl orzechowo-cynamonowy z truskawkami',
  'Koktajl truskawkowo-migdatowy na kefirze': 'Koktajl truskawkowo-migdałowy na kefirze',
  'Pulpety drobiowe z saratką z pomidorów i ogórków oraz ryżem': 'Pulpety drobiowe z sałatką z pomidorów i ogórków oraz ryżem',
  'Owsianka czekoladowa z bananem wiśniami i odzywkg białkową': 'Owsianka czekoladowa z bananem, wiśniami i odżywką białkową',
};
const FALLBACK_TITLE_BLOCKLIST = new Set([
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

const TITLE_OVERRIDES: Record<string, string> = {
  'Screenshot_20260613_123642.jpg': 'Tortilla z indykiem, warzywami i dipem',
  'Screenshot_20260614_112307.jpg': 'Bowl z łososiem, ryżem i warzywami',
  'Screenshot_20260614_112324.jpg': 'Pieczony dorsz z fasolką, komosą i pestkami dyni',
  'Screenshot_20260614_112421.jpg': 'Łosoś pieczony z warzywnym gratin i komosą',
  'Screenshot_20260614_112452.jpg': 'Łosoś w sosie kokosowo-szpinakowym z makaronem gryczanym',
  'Screenshot_20260614_112948.jpg': 'Dorsz w sosie pieczarkowo-szpinakowym z kaszą',
  'Screenshot_20260615_173213.jpg': 'Zupa pomidorowo-bazyliowa z indykiem, ryżem i pestkami dyni',
  'Screenshot_20260615_173229.jpg': 'Kremowe curry z kurczakiem, ryżem i pestkami słonecznika',
  'Screenshot_20260615_173329.jpg': 'Pieczony batat i dynia z jajkiem oraz ziołowym jogurtem',
  'Screenshot_20260615_173411.jpg': 'Sałatka z kaszą jaglaną, łososiem i ziołami',
};

const BATCH_FRIENDLY_KEYWORDS = [
  'bowl',
  'curry',
  'gulasz',
  'hummus',
  'kremowe',
  'makaron',
  'pasta',
  'sałatka makaronowa',
  'sosie',
  'tortilla',
  'zupa',
];

function cleanOcr(text: string) {
  return text
    .replace(/[©“”]/g, '')
    .replace(/\bQI\]/g, '')
    .replace(/\bpetnoziarnista\b/gi, 'pełnoziarnista')
    .replace(/\bIniany\b/g, 'lniany')
    .replace(/\bskopić\b/gi, 'skropić')
    .replace(/\bpodduszyć\b/gi, 'poddusić')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugTag(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFor(block: string) {
  const sourceFile = block.match(/Plik źródłowy:\s*`([^`]+)`/)?.[1] ?? '';
  const rawTitle = block.split('\n')[0].replace(/^###\s+/, '').trim();
  const cleanedTitle = cleanOcr(rawTitle.replace(/^Screenshot[\s_0-9]+$/i, '').trim());
  if (TITLE_OVERRIDES[sourceFile]) return TITLE_OVERRIDES[sourceFile];
  return TITLE_TEXT_OVERRIDES[cleanedTitle] ?? cleanedTitle;
}

function isSuspiciousTitle(title: string) {
  if (!title) return true;
  if (FALLBACK_TITLE_BLOCKLIST.has(title)) return true;
  if (/^screenshot\b/i.test(title)) return true;
  if (/^[a-ząćęłńóśźż]/.test(title) && !title.includes(',') && title.split(/\s+/).length <= 4) {
    return true;
  }

  const letters = title.match(/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g) ?? [];
  const uppercase = title.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) ?? [];
  if (letters.length >= 8 && uppercase.length / letters.length > 0.45) return true;

  return title
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, ''))
    .filter((word) => word.length >= 4)
    .some((word) => !/[aeiouyąęó]/i.test(word));
}

function fallbackTitlePrefix(type: ParsedRecipe['type']) {
  if (type === 'second_breakfast') return 'Przekąska';
  if (type === 'lunch') return 'Obiad';
  return 'Kolacja';
}

function buildFallbackTitle(
  ingredients: ParsedIngredient[],
  type: ParsedRecipe['type'],
  fallbackIndex: number,
) {
  const selected = ingredients
    .filter((ingredient) => ingredient.category !== 'oils' && ingredient.category !== 'spices')
    .map((ingredient) => ingredient.name)
    .filter((name, index, names) => names.indexOf(name) === index)
    .slice(0, 3);

  const suffix = selected.length > 0 ? selected.join(', ') : `wariant ${fallbackIndex}`;
  return `${fallbackTitlePrefix(type)}: ${suffix}`;
}

function normalizeIngredientName(rawName: string) {
  const cleaned = cleanOcr(rawName);
  return INGREDIENT_NAME_OVERRIDES[cleaned.toLowerCase()] ?? cleaned;
}

function detectCategory(name: string) {
  const exact = CATEGORY_OVERRIDES[name];
  if (exact) return exact;

  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'other';
}

function detectBatchFriendly(name: string) {
  const lower = name.toLowerCase();
  return BATCH_FRIENDLY_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function detectMaxStorageDays(name: string, type: ParsedRecipe['type']) {
  const lower = name.toLowerCase();
  if (type === 'second_breakfast') {
    return lower.includes('koktajl') ? 1 : 2;
  }
  if (lower.includes('łosoś') || lower.includes('dorsz')) return 2;
  if (lower.includes('kurczak') || lower.includes('indyk')) return 3;
  if (lower.includes('zupa') || lower.includes('curry') || lower.includes('gulasz')) return 4;
  if (lower.includes('makaron') || lower.includes('ryż') || lower.includes('kasza')) return 3;
  return 2;
}

function parseTags(block: string, extraTag: string) {
  const raw = block.match(/Tagi:\s*(.+)/i)?.[1] ?? '';
  const tags = raw
    .split(',')
    .map((tag) => slugTag(tag))
    .filter(Boolean);
  return ['ocr-diety', extraTag, ...tags];
}

function parseInstructions(block: string) {
  const section = block.match(/#### Przygotowanie\n([\s\S]*?)(?=\n### |\n## |$)/)?.[1] ?? '';
  return section
    .split('\n')
    .map((line) => cleanOcr(line))
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, ''));
}

function parseMacros(block: string) {
  const kcalMatch = block.match(/Kalorie:\s*([\d.]+)/i);
  const macroMatch = block.match(/Makro:\s*B\s*([\d.]+)g,\s*T\s*([\d.]+)g,\s*W\s*([\d.]+)g/i);

  return {
    kcalPerServing: kcalMatch ? Number.parseFloat(kcalMatch[1]) : null,
    proteinG: macroMatch ? Number.parseFloat(macroMatch[1]) : null,
    fatG: macroMatch ? Number.parseFloat(macroMatch[2]) : null,
    carbsG: macroMatch ? Number.parseFloat(macroMatch[3]) : null,
    nutritionVerified: Boolean(kcalMatch && macroMatch),
  };
}

function mergeIngredientPair(nameLine: string, amountLine: string) {
  return `${nameLine.replace(/^-+\s*/, '').trim()} - ${amountLine.replace(/^-+\s*/, '').trim()}`;
}

function parseIngredientLine(line: string): ParsedIngredient | null {
  const cleaned = cleanOcr(line.replace(/^-+\s*/, ''));
  if (!cleaned) return null;

  const amountMatch = cleaned.match(/(.+?)\s*-\s*(.+)$/);
  const displayText = amountMatch ? `${cleanOcr(amountMatch[1])} - ${cleanOcr(amountMatch[2])}` : cleaned;
  const name = normalizeIngredientName(amountMatch ? amountMatch[1] : cleaned);
  const gramMatches = [...displayText.matchAll(/([\d.,]+)\s*g\b/gi)];
  if (gramMatches.length === 0) return null;

  const amountRaw = gramMatches[gramMatches.length - 1][1];
  const amountG = Number.parseFloat(amountRaw.replace(',', '.'));
  if (!Number.isFinite(amountG) || amountG <= 0) return null;

  return {
    name,
    amountG,
    displayText,
    category: detectCategory(name),
  };
}

function parseIngredients(block: string) {
  const section = block.match(/#### Składniki\n([\s\S]*?)(?=\n#### Przygotowanie|\n### |\n## |$)/)?.[1] ?? '';
  const bulletLines = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));

  const mergedLines: string[] = [];
  for (let i = 0; i < bulletLines.length; i++) {
    const current = bulletLines[i];
    const next = bulletLines[i + 1];
    const hasCurrentGrams = /\b[\d.,]+\s*g\b/i.test(current);
    const nextLooksLikeAmount = Boolean(next && /^[\-\s]*[\d.,]+.*\b(g|łyż|kromka|sztuka|garść|porcja|miarka|plaster|szklanka)\b/i.test(next));

    if (!hasCurrentGrams && nextLooksLikeAmount) {
      mergedLines.push(mergeIngredientPair(current, next));
      i += 1;
      continue;
    }

    mergedLines.push(current);
  }

  return mergedLines
    .map(parseIngredientLine)
    .filter((ingredient): ingredient is ParsedIngredient => ingredient !== null);
}

function parseRecipeBlock(
  block: string,
  type: ParsedRecipe['type'],
  sourceDiet: string,
  tag: string,
  fallbackIndex: number,
): ParsedRecipe {
  const ingredients = parseIngredients(block);
  const rawName = titleFor(block);
  const name = isSuspiciousTitle(rawName) ? buildFallbackTitle(ingredients, type, fallbackIndex) : rawName;
  const macros = parseMacros(block);

  return {
    name,
    type,
    prepTimeMin: null,
    cookTimeMin: null,
    batchFriendly: detectBatchFriendly(name),
    maxStorageDays: detectMaxStorageDays(name, type),
    kcalPerServing: macros.kcalPerServing,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: null,
    baseServings: 1,
    ingredientBasis: 'per-serving',
    source: 'dietitian',
    nutritionVerified: macros.nutritionVerified,
    sourceDiet,
    tags: parseTags(block, tag),
    ingredients,
    instructions: parseInstructions(block),
  };
}

function parseMarkdownFile({
  inputPath,
  type,
  sourceDiet,
  tag,
}: typeof INPUTS[number]) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing OCR markdown: ${inputPath}`);
  }

  const markdown = fs.readFileSync(inputPath, 'utf-8');
  return markdown
    .split(/\n(?=###\s+)/)
    .filter((block) => block.trim().startsWith('### '))
    .map((block, index) => parseRecipeBlock(block, type, sourceDiet, tag, index + 1))
    .filter((recipe) => recipe.name.length > 0 && recipe.ingredients.length > 0);
}

function ensureUniqueRecipeNames(recipes: ParsedRecipe[]) {
  const seen = new Map<string, number>();

  return recipes.map((recipe) => {
    const key = `${recipe.sourceDiet}::${recipe.name}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);

    if (count === 0) return recipe;

    return {
      ...recipe,
      name: `${recipe.name} (${count + 1})`,
    };
  });
}

function main() {
  const recipes = ensureUniqueRecipeNames(INPUTS.flatMap(parseMarkdownFile));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    `${JSON.stringify({ sourceDiet: 'Import OCR A', recipes }, null, 2)}\n`,
  );

  console.log(`Parsed ${recipes.length} OCR recipes to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
