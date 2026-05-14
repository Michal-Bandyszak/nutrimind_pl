import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Info,
  X,
} from 'lucide-react';
import IngredientBasisPicker from './IngredientBasisPicker';
import { TYPE_COLORS, MEAL_TYPE_LABELS } from '@/lib/utils/recipeConstants';
import type { UploadQualityState, UploadRecipeDraft } from './types';

const LLM_PROMPT = `Jesteś asystentem kuchennym. Zwróć WYŁĄCZNIE jeden obiekt JSON, bez markdown, bez komentarzy i bez \`\`\`.

Uzupełnij pola:
{
  "name": "pełna nazwa przepisu po polsku",
  "type": "breakfast | second_breakfast | lunch | dinner | snack | cocktail | dessert",
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "batchFriendly": true | false,
  "maxStorageDays": number,
  "baseServings": number,
  "ingredientBasis": "per-serving" | "per-whole",
  "kcalPerServing": number | null,
  "proteinG": number | null,
  "carbsG": number | null,
  "fatG": number | null,
  "fiberG": number | null,
  "instructions": ["krok 1", "krok 2"],
  "ingredients": [
    {
      "name": "składnik po polsku, mała litera",
      "amountG": number,
      "displayText": "oryginalny zapis porcji, np. 2 łyżki oliwy (30g)",
      "category": "vegetables | fruits | grains | protein | dairy | oils | nuts | spices | other",
      "scalesLinearly": true | false
    }
  ]
}

Zasady:
- ingredientBasis="per-serving" gdy składniki są na 1 porcję.
- ingredientBasis="per-whole" gdy składniki są na całą recepturę; wtedy baseServings musi być > 1.
- maxStorageDays = liczba dni przechowywania.
- ingredients[].category wybieraj tylko z: vegetables, fruits, grains, protein, dairy, oils, nuts, spices, other.
- ingredients[].displayText zachowuje naturalny zapis porcji i pomaga w podglądzie.
- ingredients[].scalesLinearly=false dla oliwy, masła, soli, pieprzu, ziół, czosnku i cebuli.
- kcalPerServing, proteinG, carbsG, fatG i fiberG podaj na 1 porcję; jeśli nie wiesz, wpisz null.
- Nie dodawaj żadnego tekstu poza JSON.`;

type Props = {
  copied: boolean;
  onCopy: () => void;
  fileData: UploadRecipeDraft | null;
  quality: UploadQualityState;
  fileError: string | null;
  pasteText: string;
  onPasteTextChange: (text: string) => void;
  uploadBasis: 'per-serving' | 'per-whole';
  onUploadBasisChange: (v: 'per-serving' | 'per-whole') => void;
  uploadBaseServings: string;
  onUploadBaseServingsChange: (v: string) => void;
};

export { LLM_PROMPT };

function qualityBadgeClass(level: UploadQualityState['issues'][number]['level']) {
  if (level === 'error') return 'bg-red-100 text-red-700';
  if (level === 'warning') return 'bg-amber-100 text-amber-700';
  return 'bg-teal-100 text-teal-700';
}

function qualityIcon(level: UploadQualityState['issues'][number]['level']) {
  if (level === 'error') return <AlertTriangle size={12} />;
  if (level === 'warning') return <Info size={12} />;
  return <CheckCircle2 size={12} />;
}

export default function UploadTab({
  copied,
  onCopy,
  fileData,
  quality,
  fileError,
  pasteText,
  onPasteTextChange,
  uploadBasis,
  onUploadBasisChange,
  uploadBaseServings,
  onUploadBaseServingsChange,
}: Props) {
  const hasBlockingIssues = quality.issues.some((issue) => issue.level === 'error');
  const overallTone = hasBlockingIssues
    ? 'border-red-200 bg-red-50'
    : quality.hasMacros
      ? 'border-teal-200 bg-teal-50'
      : 'border-amber-200 bg-amber-50';

  const overallLabel = hasBlockingIssues
    ? 'Wymaga poprawek'
    : quality.hasMacros
      ? 'Dane kompletne'
      : 'Zapis możliwy, ale bez generatora';

  return (
    <div className="space-y-5">
      <div className="rounded-[1.25rem] border border-border bg-gray-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instrukcja dla AI</p>
          <p className="mt-1 text-sm text-gray-600">
            Jedna odpowiedź JSON, bez markdown. Wklej ją poniżej, sprawdź podgląd i zapisz.
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shadow-sm shrink-0"
        >
          {copied ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
          {copied ? 'Skopiowano' : 'Kopiuj instrukcję dla AI'}
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          1. Wklej odpowiedź JSON z AI
        </p>
        <div className="relative">
          <textarea
            value={pasteText}
            onChange={(e) => onPasteTextChange(e.target.value)}
            placeholder={'{\n  "name": "Owsianka z owocami",\n  "type": "breakfast",\n  ...\n}'}
            rows={8}
            spellCheck={false}
            className={`w-full px-3 py-2.5 border rounded-[1.25rem] text-xs font-mono text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 transition ${
              fileData
                ? 'border-teal-300 bg-teal-50 focus:ring-teal-500/30 focus:border-teal-400'
                : fileError
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/30 focus:border-red-400'
                  : 'border-gray-200 bg-white focus:ring-teal-500/30 focus:border-teal-400'
            }`}
          />
          {pasteText && (
            <button
              type="button"
              onClick={() => onPasteTextChange('')}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
              aria-label="Wyczyść"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {fileError && <p className="text-xs text-red-500 mt-1.5">{fileError}</p>}
        {!pasteText && (
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <ClipboardPaste size={11} />
            Wklej JSON skopiowany bezpośrednio z odpowiedzi AI
          </p>
        )}
      </div>

      {fileData && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            2. Podgląd i walidacja
          </p>
          <div className={`rounded-[1.25rem] border p-4 space-y-4 shadow-sm ${overallTone}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[fileData.type] ?? 'bg-gray-100 text-gray-500'}`}>
                  {MEAL_TYPE_LABELS[fileData.type] ?? fileData.type}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  hasBlockingIssues
                      ? 'bg-red-100 text-red-700'
                      : quality.hasMacros
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-amber-100 text-amber-700'
                }`}>
                  {overallLabel}
                </span>
                {fileData.batchFriendly && (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                    Przepis na kilka dni
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">{fileData.ingredients.length} składników</span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">{fileData.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>{uploadBasis === 'per-whole' ? `na całą recepturę · ${uploadBaseServings || '?'} porcji` : 'na 1 porcję'}</span>
                <span>max {fileData.maxStorageDays} dni</span>
                <span>{fileData.instructions.length} kroków</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white/70 border border-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Generator planu</p>
                <p className={`mt-1 text-sm font-medium ${quality.hasMacros ? 'text-gray-900' : 'text-amber-700'}`}>
                  {quality.hasMacros ? 'Makro kompletne' : 'Brakuje makro'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {quality.hasMacros
                    ? 'To dobry kandydat do późniejszej weryfikacji.'
                    : 'Brak pełnych makro oznacza, że przepis nie jest kandydatem do generatora.'}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 border border-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Składniki</p>
                <p className={`mt-1 text-sm font-medium ${quality.missingAmountCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {quality.missingAmountCount > 0
                    ? `${quality.missingAmountCount} bez amountG`
                    : 'Wszystkie mają amountG'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Każdy składnik musi mieć ilość w gramach.
                </p>
              </div>

              <div className="rounded-xl bg-white/70 border border-white/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Porcjowanie</p>
                <p className={`mt-1 text-sm font-medium ${quality.perWholeValid ? 'text-gray-900' : 'text-red-700'}`}>
                  {uploadBasis === 'per-whole'
                    ? quality.perWholeValid
                      ? `Cała receptura · ${quality.baseServingsValue} porcji`
                      : 'Ustaw baseServings > 1'
                    : 'Na 1 porcję'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {uploadBasis === 'per-whole'
                    ? 'Ten tryb wymaga liczby porcji większej niż 1.'
                    : 'Standardowy tryb dla dań liczonych na porcje.'}
                </p>
              </div>
            </div>

            {quality.issues.length > 0 && (
              <div className="space-y-2">
                {quality.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`flex gap-2 rounded-xl px-3 py-2 text-xs ${qualityBadgeClass(issue.level)}`}
                  >
                    <span className="mt-0.5 shrink-0">{qualityIcon(issue.level)}</span>
                    <div className="min-w-0">
                      <p className="font-semibold">{issue.title}</p>
                      <p className="mt-0.5 text-current/80">{issue.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <IngredientBasisPicker
            basis={uploadBasis}
            onBasisChange={onUploadBasisChange}
            baseServings={uploadBaseServings}
            onBaseServingsChange={onUploadBaseServingsChange}
          />
          <p className="mt-2 text-xs text-gray-400">
            Przepis zapisze się jako <strong>Własny</strong>. Generator planu używa tylko zweryfikowanych przepisów z pełnymi makro.
          </p>
        </div>
      )}
    </div>
  );
}
