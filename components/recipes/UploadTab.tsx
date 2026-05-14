import { X, Copy, Check, ClipboardPaste } from 'lucide-react';
import IngredientBasisPicker from './IngredientBasisPicker';
import { TYPE_COLORS, MEAL_TYPE_LABELS } from '@/lib/utils/recipeConstants';
import type { FileData } from './types';

const LLM_PROMPT = `Jesteś asystentem kuchennym. Sformatuj poniższy przepis jako JSON zgodny ze schematem.

SCHEMA:
{
  "name": "string — pełna nazwa przepisu po polsku",
  "type": "breakfast | second_breakfast | lunch | dinner | snack | cocktail | dessert",
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "batchFriendly": true | false,
  "maxStorageDays": number (1-4),
  "baseServings": number (ile porcji daje cały przepis, np. 12 dla ciasta),
  "ingredientBasis": "per-serving" | "per-whole",
  "kcalPerServing": number | null,
  "proteinG": number | null,
  "carbsG": number | null,
  "fatG": number | null,
  "fiberG": number | null,
  "instructions": ["krok 1...", "krok 2..."],
  "ingredients": [
    {
      "name": "składnik po polsku, mała litera",
      "amountG": number,
      "displayText": "np. '200g piersi z kurczaka' lub '2 łyżki oliwy (30g)'",
      "category": "vegetables | fruits | grains | protein | dairy | oils | nuts | spices | other",
      "scalesLinearly": true | false
    }
  ]
}

ZASADY:
- ingredientBasis="per-serving": składniki podane na 1 porcję (typowe dla dań głównych, zup).
- ingredientBasis="per-whole": składniki podane na CAŁĄ RECEPTURĘ (ciasta, torty, serniki).
  Wtedy ustaw baseServings=liczba_porcji_z_całej_formy (np. 12 dla sernika).
- Makroskładniki NA 1 PORCJĘ (nie na 100g). Jeśli nieznane, wstaw null.
- batchFriendly=true: zupy, gulasze, zapiekanki, potrawy jednogarnkowe.
- batchFriendly=false: sałatki, kanapki, smoothie, ciasta, dania smażone.
- maxStorageDays: zupy warzywne=3-4, mięso=2-3, ryby=1-2, sałatki=1, ciasta=2-3.
- scalesLinearly=false: oleje, oliwa, masło, sól, pieprz, zioła, czosnek, cebula.
- Odpowiedź TYLKO jako czysty JSON, bez komentarzy, bez markdown.

PRZEPIS DO PRZETWORZENIA:
[Wklej tutaj przepis z internetu lub własny opis]`;

type Props = {
  copied: boolean;
  onCopy: () => void;
  fileData: FileData | null;
  fileError: string | null;
  pasteText: string;
  onPasteTextChange: (text: string) => void;
  uploadBasis: 'per-serving' | 'per-whole';
  onUploadBasisChange: (v: 'per-serving' | 'per-whole') => void;
  uploadBaseServings: string;
  onUploadBaseServingsChange: (v: string) => void;
};

export { LLM_PROMPT };

export default function UploadTab({
  copied, onCopy, fileData, fileError, pasteText, onPasteTextChange,
  uploadBasis, onUploadBasisChange, uploadBaseServings, onUploadBaseServingsChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Step 1: LLM prompt */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          1. Skopiuj prompt do ChatGPT / Claude.ai
        </p>
        <div className="relative overflow-hidden rounded-[1.25rem] border border-border bg-gray-50/80">
          <pre className="max-h-40 overflow-x-auto whitespace-pre-wrap p-3 text-xs leading-relaxed text-gray-600">
            {LLM_PROMPT}
          </pre>
          <button
            onClick={onCopy}
            className="btn-secondary absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium shadow-sm"
          >
            {copied ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
            {copied ? 'Skopiowano' : 'Kopiuj prompt'}
          </button>
        </div>
      </div>

      {/* Step 2: Paste JSON textarea */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          2. Wklej odpowiedź JSON z ChatGPT
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
              onClick={() => onPasteTextChange('')}
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
              aria-label="Wyczyść"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {fileError && (
          <p className="text-xs text-red-500 mt-1.5">{fileError}</p>
        )}
        {!pasteText && (
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <ClipboardPaste size={11} />
            Wklej JSON skopiowany bezpośrednio z odpowiedzi ChatGPT
          </p>
        )}
      </div>

      {/* Step 3: Preview + ingredient basis */}
      {fileData && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            3. Podgląd
          </p>
          <div className="rounded-[1.25rem] border border-teal-200 bg-teal-50 p-4 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[fileData.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {MEAL_TYPE_LABELS[fileData.type] ?? fileData.type}
              </span>
              {fileData.batchFriendly && (
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Przepis na kilka dni</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900">{fileData.name}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {fileData.kcalPerServing != null
                ? <span className="font-medium text-gray-700">{Math.round(fileData.kcalPerServing)} kcal</span>
                : <span className="text-gray-400 italic">brak makro</span>}
              {fileData.proteinG != null && <span>B {Math.round(fileData.proteinG)}g</span>}
              {fileData.carbsG != null && <span>W {Math.round(fileData.carbsG)}g</span>}
              {fileData.fatG != null && <span>T {Math.round(fileData.fatG)}g</span>}
              {fileData.fiberG != null && <span>Bł {Math.round(fileData.fiberG)}g</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{fileData.ingredients.length} składników</span>
              {fileData.instructions.length > 0 && <span>{fileData.instructions.length} kroków</span>}
              <span>max {fileData.maxStorageDays} dni</span>
            </div>
          </div>
          <IngredientBasisPicker
            basis={uploadBasis}
            onBasisChange={onUploadBasisChange}
            baseServings={uploadBaseServings}
            onBaseServingsChange={onUploadBaseServingsChange}
          />
          <p className="text-xs text-gray-400 mt-2">
            Przepis zostanie zapisany jako <strong>Własny</strong> — nie trafi do automatycznego generatora planu.
          </p>
        </div>
      )}
    </div>
  );
}
