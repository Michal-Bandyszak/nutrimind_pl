const CONFIRMED_ALIASES: Record<string, string> = {
  'ser feta': 'Ser feta',
  pomarancza: 'Pomarańcza',
  'odzywka biatkowa': 'Odżywka białkowa',
  'rozma ryn suszony': 'Rozmaryn suszony',
};

export function normalizeIngredientName(value: string) {
  const cleaned = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  return CONFIRMED_ALIASES[cleaned.toLocaleLowerCase('pl-PL')] ?? cleaned;
}

export function confirmedIngredientAlias(value: string) {
  const normalized = normalizeIngredientName(value);
  return normalized !== value
    ? normalized
    : null;
}

export function isSuspiciousIngredientName(value: string) {
  const normalized = normalizeIngredientName(value);
  if (!normalized || !/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/.test(normalized)) return true;
  if (/^screenshot\b/i.test(normalized)) return true;
  if (/^[\d.,/%() -]+(?:g|kg|ml|l)?$/i.test(normalized)) return true;
  if (/(^|\s)\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|szt\.?|sztuka|sztuki)\b/i.test(normalized)) return true;
  const letters = normalized.match(/[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g) ?? [];
  const uppercase = normalized.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) ?? [];
  if (letters.length >= 8 && uppercase.length / letters.length > 0.55) return true;
  if (normalized.split(/\s+/).some((word) => {
    const lettersOnly = word.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, '');
    return lettersOnly.length >= 6 && !/[aeiouyąęó]/i.test(lettersOnly);
  })) return true;
  return false;
}
