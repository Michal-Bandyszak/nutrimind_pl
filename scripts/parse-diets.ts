/**
 * Diet parser — reads Polish dietitian .md files and extracts structured recipes.
 * Supports the "Dieta low carb" and "dieta testosteron" format.
 *
 * Output: data/parsed/<filename>.json  +  data/parsed/combined.json
 */

import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedIngredient {
  name: string;
  amountG: number;
  displayText: string;
  category: string;
}

interface ParsedRecipe {
  name: string;
  type: string;           // breakfast | lunch | dinner | snack | cocktail
  kcalPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  ingredients: ParsedIngredient[];
  instructions: string[];
  batchFriendly: boolean;
  maxStorageDays: number;
  sourceDiet: string;
}

interface ParsedDiet {
  sourceDiet: string;
  kcalTarget: number;
  recipes: ParsedRecipe[];
  substitutionRules: string[];
}

// ─── Meal type mapping ────────────────────────────────────────────────────────

const MEAL_TYPE_MAP: [string, string][] = [
  ["koktajl poranny", "cocktail"],
  ["koktajl potreningowy", "cocktail"],
  ["koktajl", "cocktail"],
  ["śniadanie", "breakfast"],
  ["lunch", "lunch"],
  ["obiad", "lunch"],
  ["kolacja", "dinner"],
];

function detectMealType(heading: string): string {
  const lower = heading.toLowerCase();
  for (const [key, val] of MEAL_TYPE_MAP) {
    if (lower.includes(key)) return val;
  }
  return "snack";
}

// ─── Ingredient category detection ───────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetables: [
    "ogórek", "marchew", "brokuł", "dynia", "rukola", "roszponka", "szpinak",
    "jarmuż", "seler", "kalarepa", "batat", "ziemniak", "papryka", "pomidor",
    "cukinia", "bakłażan", "buraki", "pietruszka", "fasolka", "rzodkiewka",
    "awokado", "kiełki", "szczypiorek", "oliwki", "soczewica", "banan", "kiwi",
  ],
  fruits: [
    "jagody", "borówka", "wiśnie", "maliny", "truskawki", "jabłko",
    "brzoskwinia", "winogrona", "mango",
  ],
  grains: [
    "kasza", "ryż", "makaron", "płatki", "chleb", "mąka", "komosa", "quinoa",
    "jaglanka", "gryczany",
  ],
  protein: [
    "kurczak", "indyk", "łosoś", "dorsz", "makrela", "wołowina", "polędwica",
    "mięso", "krewetki", "jajko", "tatar", "ryba", "mozzarella", "skyr",
  ],
  dairy: [
    "jogurt", "masło migdałowe", "śmietana", "ser", "mleczko", "napój kokosowy",
    "odżywka białkowa",
  ],
  oils: ["olej", "oliwa", "masło klarowane"],
  nuts: [
    "orzechy", "migdały", "pestki", "siemię", "sezam", "nasiona chia",
    "wiórki kokosowe",
  ],
  spices: [
    "sól", "pieprz", "zioła", "bazylia", "koperek", "natka", "oregano",
    "cynamon", "kurkuma", "imbir", "curry", "czarnuszka", "tymianek",
    "kolendra", "papryka słodka", "kardamon", "chrzan", "mięta",
  ],
};

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  // Order matters — check more specific before generic
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "other";
}

// ─── Batch cooking heuristics ─────────────────────────────────────────────────

const BATCH_FRIENDLY_KW = [
  "zupa", "gulasz", "curry", "potrawka", "kaszotto", "risotto",
  "makaron", "spaghetti", "bolognese", "budyń", "owsianka", "jaglanka", "bowl",
];

const NON_BATCH_KW = [
  "omlet", "jajecznica", "stek", "tatar", "wrap", "frytki",
  "koktajl", "grillowany", "lekka sałatka", "kolorowa sałatka",
];

function detectBatchFriendly(name: string): boolean {
  const lower = name.toLowerCase();
  if (NON_BATCH_KW.some((kw) => lower.includes(kw))) return false;
  if (BATCH_FRIENDLY_KW.some((kw) => lower.includes(kw))) return true;
  return false;
}

function detectMaxStorageDays(name: string, type: string): number {
  const lower = name.toLowerCase();
  if (type === "cocktail") return 1;
  if (lower.includes("łosoś") || lower.includes("dorsz") || lower.includes("krewetki")) return 2;
  if (lower.includes("kurczak") || lower.includes("indyk")) return 3;
  if (lower.includes("zupa") || lower.includes("kaszotto") || lower.includes("risotto") || lower.includes("curry")) return 4;
  if (lower.includes("makaron") || lower.includes("kasza") || lower.includes("ryż")) return 3;
  return 2;
}

// ─── Ingredient line parser ───────────────────────────────────────────────────

/**
 * Parses lines like: "Napój kokosowy, 1 x Szklanka (250 g)"
 * Returns the ingredient or null if not matched.
 */
function parseIngredientLine(line: string): ParsedIngredient | null {
  const match = line.match(/^(.+?),\s*[\d.,]+\s*x\s*.+?\s*\(([\d.,]+)\s*g\)/i);
  if (!match) return null;

  const name = match[1].trim();
  const amountG = parseFloat(match[2].replace(",", "."));
  if (!name || isNaN(amountG)) return null;

  return { name, amountG, displayText: line.trim(), category: detectCategory(name) };
}

// ─── Macro parser ─────────────────────────────────────────────────────────────

function parseMacros(text: string) {
  const pick = (pattern: RegExp) => {
    const m = text.match(pattern);
    return m ? parseFloat(m[1]) : null;
  };
  return {
    kcal: pick(/Kcal:\s*([\d.]+)/),
    protein: pick(/B:\s*([\d.]+)/),
    carbs: pick(/W:\s*([\d.]+)/),
    fat: pick(/T:\s*([\d.]+)/),
    fiber: pick(/Bł:\s*([\d.]+)/),
  };
}

// ─── Code block recipe extractor ─────────────────────────────────────────────

interface RecipeBlock {
  name: string;
  ingredients: ParsedIngredient[];
  instructions: string[];
}

/**
 * Parses a single code block content into a recipe block.
 * Handles multi-line recipe names (everything before first ingredient line).
 */
function parseCodeBlock(content: string): RecipeBlock | null {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Skip pure "Przepis" or "Komentarz" or "Produkty" blocks
  const firstNonEmpty = lines[0].toLowerCase();
  if (
    firstNonEmpty === "przepis" ||
    firstNonEmpty === "komentarz" ||
    firstNonEmpty === "produkty"
  ) {
    return null;
  }
  if (lines.every((l) => l.toLowerCase() === "przepis" || /^\d+\./.test(l))) {
    return null;
  }

  // Find first ingredient line index
  const firstIngIdx = lines.findIndex((l) =>
    /,\s*[\d.,]+\s*x\s*.+?\([\d.,]+\s*g\)/i.test(l)
  );
  if (firstIngIdx === -1) return null;

  // Everything before first ingredient = recipe name (joined with space)
  const nameParts = lines.slice(0, firstIngIdx);
  const name = nameParts.join(" ").trim();
  if (!name) return null;

  // Ingredients: from first ingredient line until "Przepis"
  const przepisIdx = lines.slice(firstIngIdx).findIndex((l) =>
    l.toLowerCase() === "przepis"
  );
  const endIdx = przepisIdx > -1 ? firstIngIdx + przepisIdx : lines.length;
  const ingLines = lines.slice(firstIngIdx, endIdx);

  const ingredients: ParsedIngredient[] = [];
  for (const line of ingLines) {
    const ing = parseIngredientLine(line);
    if (ing) ingredients.push(ing);
  }

  if (ingredients.length === 0) return null;

  // Instructions: numbered lines after Przepis
  const instructions: string[] = [];
  if (przepisIdx > -1) {
    for (const line of lines.slice(firstIngIdx + przepisIdx + 1)) {
      const m = line.match(/^\d+\.\s+(.+)/);
      if (m) instructions.push(m[1]);
    }
  }

  return { name, ingredients, instructions };
}

/**
 * Extracts recipe blocks from outside code blocks (bold header format).
 * Handles multi-line bold names: **Name\nPart2**
 */
function parseBoldHeaderRecipes(textWithoutCodeBlocks: string): RecipeBlock[] {
  // First, join multi-line bold names
  const joined = textWithoutCodeBlocks.replace(
    /\*\*([^*\n]+)\n([^*\n]*)\*\*/g,
    "**$1 $2**"
  );

  const results: RecipeBlock[] = [];
  const lines = joined.split("\n");

  let currentName = "";
  let currentIngredients: ParsedIngredient[] = [];
  let currentInstructions: string[] = [];
  let currentStep = ""; // accumulates multi-line instruction steps

  const flushStep = () => {
    if (currentStep) {
      currentInstructions.push(currentStep.trim());
      currentStep = "";
    }
  };

  const push = () => {
    flushStep();
    if (currentName && currentIngredients.length > 0) {
      results.push({
        name: currentName,
        ingredients: [...currentIngredients],
        instructions: [...currentInstructions],
      });
    }
    currentName = "";
    currentIngredients = [];
    currentInstructions = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Bold header: **Name**
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      push();
      const name = boldMatch[1].trim();
      if (name.toLowerCase() !== "produkty") {
        currentName = name;
      }
      continue;
    }

    if (!currentName) continue;

    // Empty line: flush current step accumulator
    if (!trimmed) {
      flushStep();
      continue;
    }

    const ing = parseIngredientLine(trimmed);
    if (ing) {
      flushStep();
      currentIngredients.push(ing);
      continue;
    }

    // Numbered step: start a new step
    const instrMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (instrMatch) {
      flushStep();
      currentStep = instrMatch[1];
      continue;
    }

    // Continuation line: append to the current step if we're inside one
    if (currentStep) {
      currentStep += " " + trimmed;
    }
  }

  push();
  return results;
}

// ─── Multi-line step extractor ────────────────────────────────────────────────

/**
 * Extracts numbered steps from plain text, handling steps that wrap across lines.
 * e.g. "1. Ugotuj jajka w koszulce: zagotuj wodę w garnku (ok.\nJajka wbij..."
 * becomes one step: "Ugotuj jajka w koszulce: zagotuj wodę w garnku (ok. Jajka wbij..."
 */
function extractMultiLineSteps(text: string): string[] {
  const lines = text.split("\n");
  const steps: string[] = [];
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) { steps.push(current.trim()); current = ""; }
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith("```")) {
      if (current) steps.push(current.trim());
      break;
    }
    if (/^\d+\./.test(trimmed)) {
      if (current) steps.push(current.trim());
      current = trimmed.replace(/^\d+\.\s*/, "");
    } else if (current) {
      // Continuation of previous step
      current += " " + trimmed;
    }
  }
  if (current) steps.push(current.trim());
  return steps;
}

// ─── Meal section parser ──────────────────────────────────────────────────────

function extractRecipesFromMealSection(
  mealSection: string,
  mealHeading: string,
  macros: ReturnType<typeof parseMacros>,
  mealType: string,
  sourceDiet: string
): ParsedRecipe[] {
  const results: RecipeBlock[] = [];

  // Collect all code blocks with their byte positions in the meal section
  const CODE_RE = /```([\s\S]*?)```/g;
  const codeBlocks: { start: number; end: number; content: string }[] = [];
  let cbm;
  while ((cbm = CODE_RE.exec(mealSection)) !== null) {
    codeBlocks.push({ start: cbm.index, end: cbm.index + cbm[0].length, content: cbm[1] });
  }

  // Process code blocks, pairing ingredient blocks with following Przepis blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    const { content, end } = codeBlocks[i];

    // Skip stand-alone Przepis blocks — handled below
    if (content.trim().toLowerCase() === "przepis") continue;

    const block = parseCodeBlock(content);
    if (!block) continue;

    // If block already has instructions (diet 2 style), just add it
    if (block.instructions.length > 0) {
      results.push(block);
      continue;
    }

    // Diet 1 style: check if next code block is a "Przepis" marker
    let instrSearchStart = end;
    if (
      i + 1 < codeBlocks.length &&
      codeBlocks[i + 1].content.trim().toLowerCase() === "przepis"
    ) {
      instrSearchStart = codeBlocks[i + 1].end;
      i++; // consume the Przepis block
    }

    // Collect plain-text numbered steps between instrSearchStart and next code block / heading
    const nextCodeStart =
      i + 1 < codeBlocks.length ? codeBlocks[i + 1].start : mealSection.length;
    const instrText = mealSection.slice(instrSearchStart, nextCodeStart);
    block.instructions = extractMultiLineSteps(instrText);

    results.push(block);
  }

  // 2. Extract bold header recipes from non-code portions
  const textWithoutCode = mealSection.replace(/```[\s\S]*?```/g, "");
  const boldBlocks = parseBoldHeaderRecipes(textWithoutCode);
  for (const bb of boldBlocks) {
    if (!results.some((r) => r.name.toLowerCase() === bb.name.toLowerCase())) {
      results.push(bb);
    }
  }

  // 3. Fallback: plain ingredient lines under the heading
  if (results.length === 0) {
    const allIngredients: ParsedIngredient[] = [];
    for (const line of mealSection.split("\n")) {
      const ing = parseIngredientLine(line.trim());
      if (ing) allIngredients.push(ing);
    }
    if (allIngredients.length > 0) {
      results.push({ name: mealHeading, ingredients: allIngredients, instructions: [] });
    }
  }

  // Filter out pseudo-blocks
  const SKIP_NAMES = ["produkty", "komentarz", "przepis"];
  const validBlocks = results.filter(
    (b) =>
      b.ingredients.length >= 2 &&
      !SKIP_NAMES.includes(b.name.toLowerCase().trim())
  );

  return validBlocks.map((block) => ({
    name: block.name,
    type: mealType,
    kcalPerServing: macros.kcal,
    proteinG: macros.protein,
    carbsG: macros.carbs,
    fatG: macros.fat,
    fiberG: macros.fiber,
    ingredients: block.ingredients,
    instructions: block.instructions,
    batchFriendly: detectBatchFriendly(block.name),
    maxStorageDays: detectMaxStorageDays(block.name, mealType),
    sourceDiet,
  }));
}

// ─── Main diet parser ─────────────────────────────────────────────────────────

const DAY_NAMES = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

function parseDietFile(filePath: string): ParsedDiet {
  const content = fs.readFileSync(filePath, "utf-8");
  const filename = path.basename(filePath, ".md");

  const kcalMatch = content.match(/##\s*([\d]+)\s*kcal/i);
  const kcalTarget = kcalMatch ? parseInt(kcalMatch[1]) : 0;

  // Extract substitution rules from header section (before day sections)
  const firstDayIdx = content.search(new RegExp(`^## (${DAY_NAMES.join("|")})`, "m"));
  const headerSection = firstDayIdx > 0 ? content.slice(0, firstDayIdx) : "";
  const substitutionRules: string[] = [];
  const ruleLines = headerSection.split("\n");
  let ruleBuffer = "";
  for (const line of ruleLines) {
    if (/^###\s*\d+\./.test(line)) {
      if (ruleBuffer) substitutionRules.push(ruleBuffer.trim());
      ruleBuffer = line.replace(/^###\s*\d+\.\s*/, "");
    } else if (ruleBuffer && line.startsWith("###")) {
      ruleBuffer += " " + line.replace(/^###\s*/, "");
    } else if (ruleBuffer && line.trim()) {
      if (!ruleBuffer) ruleBuffer = line.trim();
    }
  }
  if (ruleBuffer) substitutionRules.push(ruleBuffer.trim());

  // Split into day sections
  const daySplitPattern = new RegExp(`(?=^## (?:${DAY_NAMES.join("|")})\\b)`, "m");
  const daySections = content
    .split(daySplitPattern)
    .filter((s) => DAY_NAMES.some((d) => s.trimStart().startsWith(`## ${d}`)));

  // Deduplicate recipes by name
  const recipeMap = new Map<string, ParsedRecipe>();

  for (const daySection of daySections) {
    // Split into meal sections (### or #### headings with Kcal:)
    const mealSplitPattern = /(?=^#{3,4}\s)/m;
    const mealSections = daySection.split(mealSplitPattern).filter(Boolean);

    for (const mealSection of mealSections) {
      const firstLine = mealSection.split("\n")[0];
      if (!firstLine.includes("Kcal:")) continue;

      const headingMatch = firstLine.match(/^#{3,4}\s+(.+?)(?:\s+Kcal:.+)?$/);
      if (!headingMatch) continue;

      const mealHeading = headingMatch[1].trim();
      const mealType = detectMealType(mealHeading);
      const macros = parseMacros(firstLine);

      const recipes = extractRecipesFromMealSection(
        mealSection,
        mealHeading,
        macros,
        mealType,
        filename
      );

      for (const recipe of recipes) {
        const key = recipe.name.toLowerCase().trim();
        if (!recipeMap.has(key)) {
          recipeMap.set(key, recipe);
        }
      }
    }
  }

  return {
    sourceDiet: filename,
    kcalTarget,
    recipes: Array.from(recipeMap.values()),
    substitutionRules,
  };
}

// ─── Combine and deduplicate across diets ────────────────────────────────────

function mergeRecipes(diets: ParsedDiet[]): ParsedRecipe[] {
  const merged = new Map<string, ParsedRecipe>();
  for (const diet of diets) {
    for (const recipe of diet.recipes) {
      const key = recipe.name.toLowerCase().trim();
      if (!merged.has(key)) merged.set(key, recipe);
    }
  }
  return Array.from(merged.values());
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const DIET_FILES = [
  "Plan bazowy A.md",
  "Plan bazowy B.md",
  "Plan bazowy C.md",
  "Plan bazowy D.md",
];

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "data", "parsed");

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const parsedDiets: ParsedDiet[] = [];

  for (const dietFile of DIET_FILES) {
    const filePath = path.join(ROOT, dietFile);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Not found: ${dietFile}`);
      continue;
    }

    console.log(`\n📖 Parsing: ${dietFile}`);
    const parsed = parseDietFile(filePath);
    parsedDiets.push(parsed);

    const outFile = path.join(OUTPUT_DIR, `${parsed.sourceDiet}.json`);
    fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2));

    console.log(`✅ ${parsed.recipes.length} recipes extracted`);
    if (parsed.substitutionRules.length > 0) {
      console.log(`   📋 ${parsed.substitutionRules.length} substitution rules`);
    }
    for (const r of parsed.recipes) {
      const issues = r.ingredients.length === 0 ? " ⚠️ NO INGREDIENTS" : "";
      console.log(
        `   [${r.type}] ${r.name}${issues} — ${r.ingredients.length} ingredients, ${r.kcalPerServing ?? "?"}kcal, batch=${r.batchFriendly}`
      );
    }
  }

  const allRecipes = mergeRecipes(parsedDiets);
  const combined = {
    totalRecipes: allRecipes.length,
    diets: parsedDiets.map((d) => ({
      sourceDiet: d.sourceDiet,
      kcalTarget: d.kcalTarget,
      recipeCount: d.recipes.length,
      substitutionRules: d.substitutionRules,
    })),
    recipes: allRecipes,
  };

  const combinedPath = path.join(OUTPUT_DIR, "combined.json");
  fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2));
  console.log(`\n🎉 Combined: ${allRecipes.length} unique recipes → ${combinedPath}`);
}

main();
