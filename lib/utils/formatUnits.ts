/**
 * Polish declension map: unit → [nominative (1), plural 2-4, genitive 5+]
 * Units not in the map (szt., cm, ml, g) are invariant — returned as-is.
 */
export const UNIT_FORMS: Record<string, [string, string, string]> = {
  'łyżka':    ['łyżka',    'łyżki',    'łyżek'],
  'łyżeczka': ['łyżeczka', 'łyżeczki', 'łyżeczek'],
  'ząbek':    ['ząbek',    'ząbki',    'ząbków'],
  'główka':   ['główka',   'główki',   'główek'],
  'szklanka': ['szklanka', 'szklanki', 'szklanek'],
  'plaster':  ['plaster',  'plastry',  'plastrów'],
  'kromka':   ['kromka',   'kromki',   'kromek'],
};

export function formatUnitHint(count: number, unit: string): string {
  const whole = Math.floor(count);
  const hasFrac = count - whole >= 0.25;
  const numStr = hasFrac
    ? (whole === 0 ? '½' : `${whole}½`)
    : `${whole}`;

  const forms = UNIT_FORMS[unit];
  if (!forms) return `${numStr} ${unit}`;

  // Polish numeral agreement:
  // - exactly 1 (no fraction) → nominative
  // - fractions, or last digit 2-4 (except 12-14) → plural
  // - everything else → genitive plural
  let form: string;
  if (count === 1) {
    form = forms[0];
  } else if (hasFrac) {
    form = forms[1];
  } else {
    const lastTwo = Math.abs(count) % 100;
    const lastOne = lastTwo % 10;
    if (lastTwo >= 12 && lastTwo <= 14) {
      form = forms[2];
    } else if (lastOne >= 2 && lastOne <= 4) {
      form = forms[1];
    } else {
      form = forms[2];
    }
  }

  return `${numStr} ${form}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared ingredient formatting (used by RecipeCard, RecipeModal, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPieces(pieces: number): string {
  const rounded = Math.round(pieces * 4) / 4;
  if (rounded <= 0) return '—';
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  if (whole === 0) return `${fracStr} szt.`;
  if (fracStr) return `${whole}${fracStr} szt.`;
  return `${whole} szt.`;
}

export function formatIngredientAmount(
  grams: number,
  pieceWeightG?: number | null,
  hintUnitG?: number | null,
  hintUnit?: string | null,
): string {
  if (pieceWeightG && pieceWeightG > 0) {
    return formatPieces(grams / pieceWeightG);
  }

  let base: string;
  if (grams >= 1000) base = `${(grams / 1000).toFixed(1).replace('.0', '')} kg`;
  else if (grams < 1) base = `${Math.round(grams * 10) / 10} g`;
  else base = `${Math.round(grams)} g`;

  if (hintUnitG && hintUnitG > 0 && hintUnit) {
    const count = Math.round(grams / hintUnitG * 2) / 2;
    if (count > 0) return `${base} (~${formatUnitHint(count, hintUnit)})`;
  }

  return base;
}

export function scaleAmount(amountG: number, servings: number, scalesLinearly: boolean): number {
  if (scalesLinearly) return amountG * servings;
  return amountG * Math.sqrt(servings);
}

export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; }
  catch { return fallback; }
}
