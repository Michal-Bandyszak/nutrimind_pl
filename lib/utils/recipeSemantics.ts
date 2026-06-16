type SemanticsInput = {
  name: string;
  tags?: string | string[] | null;
  ingredientNames?: string[];
};

export type RecipeSemantics = {
  families: string[];
  proteins: string[];
  formats: string[];
};

function normalizeTags(tags?: string | string[] | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => tag.toLowerCase());
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag).toLowerCase()) : [];
  } catch {
    return [];
  }
}

function pushUnique(target: string[], value: string, condition: boolean) {
  if (condition && !target.includes(value)) target.push(value);
}

export function inferRecipeSemantics({
  name,
  tags,
  ingredientNames = [],
}: SemanticsInput): RecipeSemantics {
  const lowerName = name.toLowerCase();
  const lowerIngredients = ingredientNames.map((ingredient) => ingredient.toLowerCase());
  const lowerTags = normalizeTags(tags);
  const haystack = [lowerName, ...lowerIngredients, ...lowerTags].join(' ');

  const families: string[] = [];
  const proteins: string[] = [];
  const formats: string[] = [];

  pushUnique(families, 'porridge', /\bowsiank|\bjaglank|\bpudding chia|\bbudyń ows/i.test(haystack));
  pushUnique(families, 'eggs', /\bjaj|\bomlet|\bjajecznic|\bfrittat|\bszakszuk/i.test(haystack));
  pushUnique(families, 'sandwich-spread', /\bkanapk|\bpasta\b|\bhummus|\btwaroż|\btwaroz|\bwrap\b|\btortilla\b/i.test(haystack));
  pushUnique(families, 'smoothie', /\bkoktajl|\bsmoothie|\bshake\b/i.test(haystack));
  pushUnique(families, 'salad', /\bsałatk|\bsalatk|\bbowl\b/i.test(haystack));

  pushUnique(proteins, 'egg', /\bjaj/i.test(haystack));
  pushUnique(proteins, 'fish', /\błoso|\blosos|\bdorsz|\btuńczyk|\btunczyk|\bsardyn|\bkrewet/i.test(haystack));
  pushUnique(proteins, 'poultry', /\bkurczak|\bindyk\b/i.test(haystack));
  pushUnique(proteins, 'beef', /\bwołow|\bwolow|\bwoł\b|\bstek\b|\btatar\b/i.test(haystack));
  pushUnique(proteins, 'legumes', /\bciecierzyc|\bsoczewic|\bfasol|\bhummus\b/i.test(haystack));

  pushUnique(formats, 'sandwich', /\bkanapk|\bgrzank|\btost\b/i.test(haystack));
  pushUnique(formats, 'wrap', /\bwrap\b|\btortilla\b/i.test(haystack));
  pushUnique(formats, 'component', /\bpasta\b|\bhummus|\bdip\b|\btwaroż|\btwaroz/i.test(haystack));
  pushUnique(formats, 'liquid', /\bkoktajl|\bsmoothie|\bshake\b/i.test(haystack));

  return { families, proteins, formats };
}

export function hasSemanticOverlap(a: string[], b: string[]) {
  return a.some((value) => b.includes(value));
}
