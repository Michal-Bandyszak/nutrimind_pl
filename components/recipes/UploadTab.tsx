import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  PencilLine,
  Info,
  X,
} from 'lucide-react';
import IngredientBasisPicker from './IngredientBasisPicker';
import { TYPE_COLORS, MEAL_TYPE_LABELS } from '@/lib/utils/recipeConstants';
import type { UploadQualityState, UploadRecipeDraft } from './types';

const LLM_PROMPT = `Przepisz poniższy przepis po polsku w prostym, czytelnym formacie.

Format odpowiedzi:
Nazwa: ...
Typ: śniadanie / drugie śniadanie / obiad / kolacja / przekąska / koktajl / deser
Porcje: ...

Składniki:
- 200 g ...
- 2 łyżki ... (30 g)

Przygotowanie:
1. ...
2. ...

Zasady:
- Przy składnikach podawaj ilości w gramach, jeśli da się je ustalić.
- Zachowaj naturalny zapis porcji, np. "2 łyżki oliwy (30 g)".
- Nie używaj JSON ani markdown table.
- Nie dodawaj komentarzy poza przepisem.`;

type Props = {
  copied: boolean;
  onCopy: () => void;
  fileData: UploadRecipeDraft | null;
  quality: UploadQualityState;
  fileError: string | null;
  pasteText: string;
  onPasteTextChange: (text: string) => void;
  onUseDraft: () => void;
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
  onUseDraft,
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
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Wklej przepis</p>
          <p className="mt-1 text-sm text-gray-600">
            Tekst z notatki, strony internetowej albo odpowiedź z AI.
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="btn-secondary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shadow-sm shrink-0"
        >
          {copied ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
          {copied ? 'Skopiowano' : 'Kopiuj prośbę do AI'}
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          1. Treść przepisu
        </p>
        <div className="relative">
          <textarea
            value={pasteText}
            onChange={(e) => onPasteTextChange(e.target.value)}
            placeholder={'Owsianka z jabłkiem\n\nSkładniki:\n- 50 g płatków owsianych\n- 150 g jabłka\n- 200 ml mleka\n\nPrzygotowanie:\n1. Ugotuj płatki z mlekiem.\n2. Dodaj jabłko i cynamon.'}
            rows={10}
            spellCheck
            className={`w-full px-3 py-2.5 border rounded-[1.25rem] text-sm leading-relaxed text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 transition ${
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
            Najlepiej działa układ: nazwa, składniki, przygotowanie.
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onUseDraft}
                className="btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
              >
                <PencilLine size={13} />
                Dopracuj w formularzu
              </button>
              <span className="text-xs text-gray-500">
                {hasBlockingIssues
                  ? 'Uzupełnij brakujące gramatury przed zapisem.'
                  : 'Możesz też zapisać od razu.'}
              </span>
            </div>
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
