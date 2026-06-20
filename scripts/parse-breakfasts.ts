/**
 * Parses the OCR-exported breakfast markdown into seedable recipe JSON.
 *
 * Input:  sniadania.md
 * Output: data/curated/breakfast-recipes.json
 */

import fs from "fs";
import path from "path";
import { getBreakfastSource, getLocalImportSetupHint } from "./localImportConfig";

type ParsedIngredient = {
  name: string;
  amountG: number;
  displayText: string;
  category: string;
};

type ParsedRecipe = {
  name: string;
  type: "breakfast";
  prepTimeMin: null;
  cookTimeMin: null;
  batchFriendly: boolean;
  maxStorageDays: number;
  kcalPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: null;
  baseServings: 1;
  ingredientBasis: "per-serving";
  source: "dietitian";
  nutritionVerified: true;
  sourceDiet: string;
  tags: string[];
  ingredients: ParsedIngredient[];
  instructions: string[];
};

const ROOT = path.join(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "curated", "breakfast-recipes.json");
const { inputPath: INPUT_PATH, sourceDiet: SOURCE_DIET } = getBreakfastSource();

const TITLE_OVERRIDES: Record<string, string> = {
  "Screenshot_20260613_120546.jpg": "Jajecznica z wiosenną sałatką z rzodkiewką i ogórkiem",
  "Screenshot_20260613_120628.jpg": "Omlet curry z papryką i szpinakiem",
  "Screenshot_20260613_120720.jpg": "Omlet z papryką, bakłażanem i rukolą",
  "Screenshot_20260613_120740.jpg": "Omlet ze szpinakiem i guacamole",
  "Screenshot_20260613_120822.jpg": "Bazyliowa pasta jajeczna z cukinią",
  "Screenshot_20260613_120837.jpg": "Koperkowa pasta jajeczna ze słupkami warzyw",
  "Screenshot_20260613_120851.jpg": "Szakszuka ze szpinakiem",
  "Screenshot_20260613_120909.jpg": "Szakszuka z papryką",
  "Screenshot_20260613_120933.jpg": "Jajka w koszulce z jogurtem i fasolką szparagową",
  "Screenshot_20260613_120951.jpg": "Śródziemnomorska sałatka z burakiem, awokado i jajkiem",
  "Screenshot_20260613_121006.jpg": "Bowl z dipem koperkowym, brokułem i jajkiem",
  "Screenshot_20260613_121040.jpg": "Zielona sałatka z jajkiem na miękko i fasolką",
  "Screenshot_20260613_121317.jpg": "Sałatka z jajkiem, pomidorkami, rukolą i orzechami",
  "Screenshot_20260613_121337.jpg": "Kremowa pasta jajeczna z awokado i warzywami",
  "Screenshot_20260613_121439.jpg": "Keto naleśniki z pastą kokosową i borówkami",
  "Screenshot_20260613_121452.jpg": "Keto naleśniki z jogurtem i musem jagodowym",
  "Screenshot_20260613_122345.jpg": "Bakłażan zapiekany z mozzarellą i pomidorem",
  "Screenshot_20260613_122538.jpg": "Sałatka z indykiem, brokułem i marchewką",
  "Screenshot_20260613_122602.jpg": "Białkowa pasta z indyka i warzyw w liściach sałaty",
  "Screenshot_20260613_122637.jpg": "Sałatka z indykiem i burakiem",
  "Screenshot_20260613_122852.jpg": "Cynamonowe placuszki twarogowo-bananowe",
  "Screenshot_20260613_122917.jpg": "Białkowy pudding chia z malinami",
  "Screenshot_20260613_122935.jpg": "Korzenny omlet z musem wiśniowym i gorzką czekoladą",
};

const TITLE_FIXES: Record<string, string> = {
  "Omilet curry z papryką I szpinakiem": "Omlet curry z papryką i szpinakiem",
};

const INGREDIENT_NAME_OVERRIDES: Record<string, string> = {
  "bakłażan": "Bakłażan",
  "banan": "Banan",
  "bazylia suszona": "Bazylia suszona",
  "bazylia świeża": "Bazylia świeża",
  "borówki amerykańskie": "Borówki amerykańskie",
  "brokuł": "Brokuł",
  "buraki ugotowane": "Burak ugotowany",
  "curry przyprawa": "Curry",
  "cukinia": "Cukinia",
  "cynamon mielony": "Cynamon mielony",
  "czekolada gorzka 70-85% kakao": "Czekolada gorzka 70-85% kakao",
  "fasolka szparagowa": "Fasolka szparagowa",
  "gałka muszkatołowa mielona": "Gałka muszkatołowa mielona",
  "imbir mielony": "Imbir mielony",
  "indyk pierś": "Pierś z indyka",
  "jabtko": "Jabłko",
  "jagody mrożone": "Jagody mrożone",
  "jajko kurze": "Jajko",
  "jogurt naturalny 2%": "Jogurt naturalny 2%",
  "kardamon mielony": "Kardamon mielony",
  "kiełki lucerny": "Kiełki lucerny",
  "kiwi": "Kiwi",
  "kolendra liście suszone": "Kolendra suszona",
  "koper świeży": "Koper świeży",
  "kumin w proszku (kmin rzymski)": "Kumin",
  "kurkuma mielona": "Kurkuma mielona",
  "łosoś atlantycki": "Łosoś atlantycki",
  "łosoś pieczony (fjord fiskursson)": "Łosoś pieczony",
  "maka kokosowa": "Mąka kokosowa",
  "marchew": "Marchew",
  "masło migdałowe bez soli": "Masło migdałowe",
  "mąka kokosowa": "Mąka kokosowa",
  "maliny": "Maliny",
  "mleczko kokosowe 19%": "Mleczko kokosowe",
  "napój kokosowy": "Napój kokosowy",
  "nasiona chia": "Nasiona chia",
  "nasiona słonecznika": "Pestki słonecznika",
  "natka pietruszki": "Natka pietruszki",
  "ocet jabłkowy": "Ocet jabłkowy",
  "odżywka białkowa": "Odżywka białkowa",
  "ogórek": "Ogórek świeży",
  "olej iniany": "Olej lniany",
  "olej z awokado": "Olej z awokado",
  "oliwki zielone marynowane": "Oliwki zielone marynowane",
  "oregano suszone": "Oregano suszone",
  "orzechy włoskie": "Orzechy włoskie",
  "papryka czerwona": "Papryka czerwona",
  "pasta kokosowa": "Pasta kokosowa",
  "pestki dyni": "Pestki dyni",
  "pieczarki": "Pieczarki",
  "pieprz czarny": "Pieprz czarny",
  "pietruszka korzeń": "Pietruszka korzeń",
  "pomidor czerwony": "Pomidor",
  "pomidory koktajlowe": "Pomidory koktajlowe",
  "proszek do pieczenia": "Proszek do pieczenia",
  "roszponka": "Roszponka",
  "rukola": "Rukola",
  "rzodkiewka": "Rzodkiewka",
  "sałata lodowa": "Sałata lodowa",
  "ser halloumi": "Ser halloumi",
  "ser kozi miękki": "Ser kozi miękki",
  "ser mozzarella": "Ser mozzarella",
  "sezam": "Sezam",
  "siemię lniane": "Siemię lniane",
  "słodka papryka przyprawa": "Papryka słodka",
  "sok z cytryny": "Sok z cytryny",
  "sól": "Sól",
  "stewia": "Stewia",
  "szczypiorek": "Szczypiorek",
  "szparagi": "Szparagi",
  "szpinak": "Szpinak",
  "twaróg półtłusty": "Twaróg półtłusty",
  "wiśnie mrożone": "Wiśnie mrożone",
  "zioła prowansalskie przyprawa": "Zioła prowansalskie",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetables: [
    "bakłażan", "brokuł", "burak", "cukinia", "fasolka", "kiełki", "marchew",
    "ogórek", "papryka", "pieczarki", "pietruszka", "pomidor", "roszponka",
    "rukola", "rzodkiewka", "sałata", "szczypiorek", "szparagi", "szpinak",
  ],
  fruits: [
    "awokado", "banan", "borówki", "jagody", "jabłko", "kiwi", "maliny",
    "sok z cytryny", "wiśnie",
  ],
  grains: ["mąka", "naleśniki"],
  protein: ["indyk", "jajko", "łosoś", "odżywka białkowa"],
  dairy: ["halloumi", "jogurt", "mleczko", "mozzarella", "ser", "twaróg"],
  oils: ["masło", "olej", "oliwa", "pasta kokosowa"],
  nuts: ["nasiona", "orzechy", "pestki", "sezam", "siemię"],
  spices: [
    "bazylia", "curry", "cynamon", "gałka", "imbir", "kardamon", "kolendra",
    "koper", "kumin", "kurkuma", "natka", "oregano", "papryka słodka",
    "pieprz", "sól", "stewia", "zioła",
  ],
};

const CATEGORY_OVERRIDES: Record<string, string> = {
  "Czekolada gorzka 70-85% kakao": "other",
  "Masło migdałowe": "nuts",
  "Napój kokosowy": "dairy",
  "Olej z awokado": "oils",
  "Oliwki zielone marynowane": "vegetables",
  "Pasta kokosowa": "oils",
  "Proszek do pieczenia": "spices",
};

const BATCH_FRIENDLY_KEYWORDS = ["pasta", "pudding", "placuszki", "koktajl"];

function cleanOcr(text: string): string {
  return text
    .replace(/[©“”_]/g, "")
    .replace(/\bQI\]/g, "")
    .replace(/\(I/g, "")
    .replace(/\(\s*O\)/g, "")
    .replace(/\bO\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIngredientName(rawName: string): string {
  const cleaned = cleanOcr(rawName).trim();
  const key = cleaned.toLowerCase();
  return INGREDIENT_NAME_OVERRIDES[key] ?? cleaned;
}

function detectCategory(name: string): string {
  const exact = CATEGORY_OVERRIDES[name];
  if (exact) return exact;

  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return "other";
}

function parseIngredientLine(line: string): ParsedIngredient | null {
  const cleaned = cleanOcr(line.replace(/^-\s*/, ""));
  const nameMatch = cleaned.match(/^(.+?)\s+-\s+/);
  const gramMatches = [...cleaned.matchAll(/([\d.,]+)\s*g\b/gi)];
  if (!nameMatch || gramMatches.length === 0) return null;

  const amountRaw = gramMatches[gramMatches.length - 1][1];
  const amountG = Number.parseFloat(amountRaw.replace(",", "."));
  if (!Number.isFinite(amountG) || amountG <= 0) return null;

  const name = normalizeIngredientName(nameMatch[1]);
  return {
    name,
    amountG,
    displayText: cleaned.replace(nameMatch[1], name),
    category: detectCategory(name),
  };
}

function parseTags(block: string): string[] {
  const match = block.match(/Tagi:\s*(.+)/i);
  if (!match) return ["sniadania-ocr"];
  const tags = match[1]
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-"));
  return ["sniadania-ocr", ...tags];
}

function parseInstructions(block: string): string[] {
  const section = block.match(/#### Przygotowanie\n([\s\S]*)/)?.[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .map((line) => cleanOcr(line.replace(/^\d+\.\s*/, "").replace(/Inian/g, "lnian")));
}

function parseIngredients(block: string): ParsedIngredient[] {
  const section = block.match(/#### Składniki\n([\s\S]*?)(?=\n#### Przygotowanie|$)/)?.[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map(parseIngredientLine)
    .filter((ingredient): ingredient is ParsedIngredient => ingredient !== null);
}

function titleFor(block: string): string {
  const sourceFile = block.match(/Plik źródłowy:\s*`([^`]+)`/)?.[1] ?? "";
  const rawTitle = block.split("\n")[0].replace(/^###\s+/, "").trim();
  return TITLE_OVERRIDES[sourceFile] ?? TITLE_FIXES[rawTitle] ?? cleanOcr(rawTitle);
}

function parseRecipeBlock(block: string): ParsedRecipe {
  const kcal = Number.parseFloat(block.match(/Kalorie:\s*([\d.]+)/i)?.[1] ?? "");
  const macro = block.match(/Makro:\s*B\s*([\d.]+)g,\s*T\s*([\d.]+)g,\s*W\s*([\d.]+)g/i);
  if (!Number.isFinite(kcal) || !macro) {
    throw new Error(`Could not parse macros for block: ${block.slice(0, 80)}`);
  }

  const ingredients = parseIngredients(block);
  if (ingredients.length === 0) {
    throw new Error(`No ingredients found for: ${titleFor(block)}`);
  }

  const name = titleFor(block);
  const lowerName = name.toLowerCase();

  return {
    name,
    type: "breakfast",
    prepTimeMin: null,
    cookTimeMin: null,
    batchFriendly: BATCH_FRIENDLY_KEYWORDS.some((keyword) => lowerName.includes(keyword)),
    maxStorageDays: lowerName.includes("pudding") ? 2 : 1,
    kcalPerServing: kcal,
    proteinG: Number.parseFloat(macro[1]),
    fatG: Number.parseFloat(macro[2]),
    carbsG: Number.parseFloat(macro[3]),
    fiberG: null,
    baseServings: 1,
    ingredientBasis: "per-serving",
    source: "dietitian",
    nutritionVerified: true,
    sourceDiet: SOURCE_DIET,
    tags: parseTags(block),
    ingredients,
    instructions: parseInstructions(block),
  };
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Breakfast source not found at ${INPUT_PATH}. ${getLocalImportSetupHint()}`);
  }

  const markdown = fs.readFileSync(INPUT_PATH, "utf-8");
  const blocks = markdown
    .split(/\n(?=###\s+)/)
    .filter((block) => block.trim().startsWith("### "));
  const recipes = blocks.map(parseRecipeBlock);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    `${JSON.stringify({ sourceDiet: SOURCE_DIET, recipes }, null, 2)}\n`,
  );

  console.log(`Parsed ${recipes.length} breakfast recipes to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
