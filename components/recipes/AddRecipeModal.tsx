'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Plus, Trash2, ClipboardPaste } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

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

const VALID_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'dinner', 'snack', 'cocktail', 'dessert'] as const;

const TYPE_LABELS: Record<string, string> = {
  breakfast:        'Śniadanie',
  second_breakfast: 'Drugie śniadanie',
  lunch:            'Obiad',
  dinner:           'Kolacja',
  snack:            'Przekąska',
  cocktail:         'Koktajl',
  dessert:          'Ciasto / deser',
};

const TYPE_COLORS: Record<string, string> = {
  breakfast:        'bg-amber-100 text-amber-700',
  second_breakfast: 'bg-orange-100 text-orange-700',
  lunch:            'bg-teal-100 text-teal-700',
  dinner:           'bg-blue-100 text-blue-700',
  snack:            'bg-rose-100 text-rose-700',
  cocktail:         'bg-violet-100 text-violet-700',
  dessert:          'bg-pink-100 text-pink-700',
};

const CATEGORIES = [
  'vegetables', 'fruits', 'grains', 'protein',
  'dairy', 'oils', 'nuts', 'spices', 'other',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  vegetables: 'Warzywa', fruits: 'Owoce', grains: 'Zboża',
  protein: 'Białko', dairy: 'Nabiał', oils: 'Oleje',
  nuts: 'Orzechy', spices: 'Przyprawy', other: 'Inne',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FileData = {
  name: string;
  type: string;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  batchFriendly: boolean;
  maxStorageDays: number;
  baseServings?: number;
  ingredientBasis?: 'per-serving' | 'per-whole';
  kcalPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  instructions: string[];
  ingredients: {
    name: string;
    amountG: number;
    displayText?: string;
    category: string;
    scalesLinearly: boolean;
  }[];
};

type IngredientRow = {
  id: string;
  name: string;
  amountG: string;
  category: string;
  scalesLinearly: boolean;
};

type StepRow = {
  id: string;
  text: string;
};

type Props = {
  onClose: () => void;
  onSaved: (recipe: RecipeWithIngredients) => void;
};

function genId() {
  return Math.random().toString(36).slice(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export default function AddRecipeModal({ onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload tab
  const [copied, setCopied] = useState(false);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  // Upload tab ingredient basis override
  const [uploadBasis, setUploadBasis] = useState<'per-serving' | 'per-whole'>('per-serving');
  const [uploadBaseServings, setUploadBaseServings] = useState('1');

  // Manual tab
  const [name, setName] = useState('');
  const [type, setType] = useState('breakfast');
  const [prepTimeMin, setPrepTimeMin] = useState('');
  const [batchFriendly, setBatchFriendly] = useState(false);
  const [maxStorageDays, setMaxStorageDays] = useState('1');
  const [manualBasis, setManualBasis] = useState<'per-serving' | 'per-whole'>('per-serving');
  const [manualBaseServings, setManualBaseServings] = useState('1');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { id: genId(), name: '', amountG: '', category: 'other', scalesLinearly: true },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([
    { id: genId(), text: '' },
  ]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Body overflow lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(LLM_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function processJsonText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setFileError(null);
      setFileData(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as FileData;
      if (!parsed.name || !parsed.type || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
        setFileError('Nieprawidłowy format JSON. Wymagane pola: "name", "type", "ingredients".');
        setFileData(null);
        return;
      }
      if (!VALID_TYPES.includes(parsed.type as typeof VALID_TYPES[number])) {
        setFileError(`Nieprawidłowy typ: "${parsed.type}". Dozwolone: ${VALID_TYPES.join(', ')}.`);
        setFileData(null);
        return;
      }
      setFileError(null);
      setFileData(parsed);
      // Auto-set basis from JSON if present
      if (parsed.ingredientBasis === 'per-whole') {
        setUploadBasis('per-whole');
        setUploadBaseServings(String(parsed.baseServings ?? 1));
      } else {
        setUploadBasis('per-serving');
        setUploadBaseServings(String(parsed.baseServings ?? 1));
      }
    } catch {
      setFileError('Błąd parsowania JSON. Sprawdź czy tekst to poprawny JSON.');
      setFileData(null);
    }
  }

  function buildPayloadFromForm(): FileData | null {
    if (!name.trim()) { setError('Nazwa przepisu jest wymagana.'); return null; }
    const validIngredients = ingredients.filter(i => i.name.trim() && i.amountG);
    if (validIngredients.length === 0) { setError('Wymagany co najmniej 1 składnik z nazwą i ilością.'); return null; }
    const isValidNum = (v: string) => v !== '' && !isNaN(Number(v)) && Number(v) >= 0;
    return {
      name: name.trim(),
      type,
      prepTimeMin: prepTimeMin ? Number(prepTimeMin) : null,
      cookTimeMin: null,
      batchFriendly,
      maxStorageDays: Number(maxStorageDays) || 1,
      baseServings: manualBasis === 'per-whole' ? (Number(manualBaseServings) || 1) : 1,
      ingredientBasis: manualBasis,
      kcalPerServing: isValidNum(kcal) ? Number(kcal) : null,
      proteinG:       isValidNum(protein) ? Number(protein) : null,
      carbsG:         isValidNum(carbs) ? Number(carbs) : null,
      fatG:           isValidNum(fat) ? Number(fat) : null,
      fiberG:         isValidNum(fiber) ? Number(fiber) : null,
      instructions: steps.map(s => s.text).filter(Boolean),
      ingredients: validIngredients.map(i => ({
        name: i.name.trim(),
        amountG: Number(i.amountG),
        category: i.category,
        scalesLinearly: i.scalesLinearly,
      })),
    };
  }

  async function handleSave() {
    setError(null);
    let payload: FileData | null;
    if (activeTab === 'upload') {
      if (!fileData) return;
      payload = {
        ...fileData,
        ingredientBasis: uploadBasis,
        baseServings: Number(uploadBaseServings) || 1,
      };
    } else {
      payload = buildPayloadFromForm();
    }
    if (!payload) return;
    setSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'user', nutritionVerified: false }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Błąd podczas zapisywania.');
        return;
      }
      onSaved(json.data as RecipeWithIngredients);
    } catch {
      setError('Błąd sieci. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  const isSaveDisabled = saving || (activeTab === 'upload' && !fileData);

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Dodaj przepis</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(['upload', 'manual'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-teal-700 border-b-2 border-teal-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'upload' ? 'Wklej JSON' : 'Wpisz ręcznie'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {activeTab === 'upload' ? (
            <UploadTab
              copied={copied}
              onCopy={handleCopy}
              fileData={fileData}
              fileError={fileError}
              pasteText={pasteText}
              onPasteTextChange={(text) => { setPasteText(text); processJsonText(text); }}
              uploadBasis={uploadBasis}
              onUploadBasisChange={setUploadBasis}
              uploadBaseServings={uploadBaseServings}
              onUploadBaseServingsChange={setUploadBaseServings}
            />
          ) : (
            <ManualTab
              name={name} setName={setName}
              type={type} setType={(newType) => {
                setType(newType);
                if (newType === 'dessert' && manualBasis === 'per-serving') {
                  setManualBasis('per-whole');
                  if (Number(manualBaseServings) <= 1) setManualBaseServings('10');
                }
              }}
              prepTimeMin={prepTimeMin} setPrepTimeMin={setPrepTimeMin}
              batchFriendly={batchFriendly} setBatchFriendly={setBatchFriendly}
              maxStorageDays={maxStorageDays} setMaxStorageDays={setMaxStorageDays}
              manualBasis={manualBasis} setManualBasis={setManualBasis}
              manualBaseServings={manualBaseServings} setManualBaseServings={setManualBaseServings}
              kcal={kcal} setKcal={setKcal}
              protein={protein} setProtein={setProtein}
              carbs={carbs} setCarbs={setCarbs}
              fat={fat} setFat={setFat}
              fiber={fiber} setFiber={setFiber}
              ingredients={ingredients}
              onAddIngredient={() => setIngredients(prev => [...prev, { id: genId(), name: '', amountG: '', category: 'other', scalesLinearly: true }])}
              onRemoveIngredient={(id) => setIngredients(prev => prev.filter(i => i.id !== id))}
              onUpdateIngredient={(id, field, value) => setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))}
              steps={steps}
              onAddStep={() => setSteps(prev => [...prev, { id: genId(), text: '' }])}
              onRemoveStep={(id) => setSteps(prev => prev.filter(s => s.id !== id))}
              onUpdateStep={(id, text) => setSteps(prev => prev.map(s => s.id === id ? { ...s, text } : s))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3">
          {error ? (
            <p className="text-sm text-red-500 flex-1">{error}</p>
          ) : (
            <span className="flex-1" />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Zapisywanie…' : 'Zapisz przepis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload tab
// ─────────────────────────────────────────────────────────────────────────────

function IngredientBasisPicker({
  basis, onBasisChange, baseServings, onBaseServingsChange,
}: {
  basis: 'per-serving' | 'per-whole';
  onBasisChange: (v: 'per-serving' | 'per-whole') => void;
  baseServings: string;
  onBaseServingsChange: (v: string) => void;
}) {
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-amber-700">Składniki podane na:</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onBasisChange('per-serving')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
            basis === 'per-serving'
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'
          }`}
        >
          1 porcję
        </button>
        <button
          type="button"
          onClick={() => onBasisChange('per-whole')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
            basis === 'per-whole'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300'
          }`}
        >
          Całą formę / recepturę
        </button>
      </div>
      {basis === 'per-whole' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-amber-700 shrink-0">Liczba porcji z całości:</label>
          <input
            type="number"
            min="1"
            max="50"
            value={baseServings}
            onChange={(e) => onBaseServingsChange(e.target.value)}
            className="w-20 px-2 py-1 border border-amber-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition bg-white"
          />
          <span className="text-xs text-amber-600">porcji</span>
        </div>
      )}
      <p className="text-xs text-amber-600">
        {basis === 'per-whole'
          ? `Wpisz składniki na całą formę/recepturę. System podzieli na ${Number(baseServings) || '?'} porcji automatycznie.`
          : 'Standardowe dania: składniki na 1 osobę / 1 porcję.'}
      </p>
    </div>
  );
}

function UploadTab({
  copied, onCopy, fileData, fileError, pasteText, onPasteTextChange,
  uploadBasis, onUploadBasisChange, uploadBaseServings, onUploadBaseServingsChange,
}: {
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
}) {
  return (
    <div className="space-y-5">
      {/* Step 1: LLM prompt */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          1. Skopiuj prompt do ChatGPT / Claude.ai
        </p>
        <div className="relative border border-gray-200 rounded-xl overflow-hidden">
          <pre className="text-xs text-gray-600 bg-gray-50 p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
            {LLM_PROMPT}
          </pre>
          <button
            onClick={onCopy}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-teal-700 hover:border-teal-300 transition shadow-sm"
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
            className={`w-full px-3 py-2.5 border rounded-xl text-xs font-mono text-gray-700 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 transition ${
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
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
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
          <div className="border border-teal-200 rounded-xl p-4 bg-teal-50 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[fileData.type] ?? 'bg-gray-100 text-gray-500'}`}>
                {TYPE_LABELS[fileData.type] ?? fileData.type}
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

// ─────────────────────────────────────────────────────────────────────────────
// Manual tab
// ─────────────────────────────────────────────────────────────────────────────

function ManualTab({
  name, setName, type, setType,
  prepTimeMin, setPrepTimeMin,
  batchFriendly, setBatchFriendly, maxStorageDays, setMaxStorageDays,
  manualBasis, setManualBasis, manualBaseServings, setManualBaseServings,
  kcal, setKcal, protein, setProtein, carbs, setCarbs, fat, setFat, fiber, setFiber,
  ingredients, onAddIngredient, onRemoveIngredient, onUpdateIngredient,
  steps, onAddStep, onRemoveStep, onUpdateStep,
}: {
  name: string; setName: (v: string) => void;
  type: string; setType: (v: string) => void;
  prepTimeMin: string; setPrepTimeMin: (v: string) => void;
  batchFriendly: boolean; setBatchFriendly: (v: boolean) => void;
  maxStorageDays: string; setMaxStorageDays: (v: string) => void;
  manualBasis: 'per-serving' | 'per-whole'; setManualBasis: (v: 'per-serving' | 'per-whole') => void;
  manualBaseServings: string; setManualBaseServings: (v: string) => void;
  kcal: string; setKcal: (v: string) => void;
  protein: string; setProtein: (v: string) => void;
  carbs: string; setCarbs: (v: string) => void;
  fat: string; setFat: (v: string) => void;
  fiber: string; setFiber: (v: string) => void;
  ingredients: IngredientRow[];
  onAddIngredient: () => void;
  onRemoveIngredient: (id: string) => void;
  onUpdateIngredient: (id: string, field: keyof IngredientRow, value: string | boolean) => void;
  steps: StepRow[];
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onUpdateStep: (id: string, text: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Basic info */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Podstawowe informacje</p>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Nazwa *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Owsianka z owocami"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Typ *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
          >
            {VALID_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Czas przygotowania (min)</label>
            <input
              type="number" min="0"
              value={prepTimeMin}
              onChange={(e) => setPrepTimeMin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={batchFriendly}
              onChange={(e) => setBatchFriendly(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-700"
            />
            <span className="text-sm text-gray-700">Przepis na kilka dni</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">Max. dni przech.</label>
            <input
              type="number" min="1" max="5"
              value={maxStorageDays}
              onChange={(e) => setMaxStorageDays(e.target.value)}
              className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
            />
          </div>
        </div>
      </section>

      {/* Ingredient basis */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Jednostka składników</p>
        <IngredientBasisPicker
          basis={manualBasis}
          onBasisChange={setManualBasis}
          baseServings={manualBaseServings}
          onBaseServingsChange={setManualBaseServings}
        />
      </section>

      {/* Macros */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Makroskładniki (na 1 porcję)</p>
          <p className="text-xs text-gray-400">opcjonalne — bez makro przepis nie trafi do planu</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kalorie *</label>
            <input type="number" min="0" value={kcal} onChange={(e) => setKcal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Białko (g) *</label>
            <input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Węglowodany (g) *</label>
            <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tłuszcze (g) *</label>
            <input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Błonnik (g)</label>
            <input type="number" min="0" value={fiber} onChange={(e) => setFiber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition" />
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Składniki</p>
        <div className="space-y-2">
          {ingredients.map((ing) => (
            <div key={ing.id} className="grid grid-cols-[1fr_80px_120px_auto_auto] gap-2 items-center">
              <input
                type="text"
                placeholder="Nazwa składnika"
                value={ing.name}
                onChange={(e) => onUpdateIngredient(ing.id, 'name', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
              />
              <input
                type="number"
                placeholder="g"
                min="0"
                value={ing.amountG}
                onChange={(e) => onUpdateIngredient(ing.id, 'amountG', e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
              />
              <select
                value={ing.category}
                onChange={(e) => onUpdateIngredient(ing.id, 'category', e.target.value)}
                className="px-2 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 cursor-pointer" title="Skaluje liniowo">
                <input
                  type="checkbox"
                  checked={ing.scalesLinearly}
                  onChange={(e) => onUpdateIngredient(ing.id, 'scalesLinearly', e.target.checked)}
                  className="w-3.5 h-3.5 accent-teal-700"
                />
                <span className="text-xs text-gray-400">lin.</span>
              </label>
              <button
                onClick={() => onRemoveIngredient(ing.id)}
                disabled={ingredients.length === 1}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Usuń składnik"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={onAddIngredient}
          className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-800 font-medium transition"
        >
          <Plus size={13} /> Dodaj składnik
        </button>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kroki przygotowania (opcjonalne)</p>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex gap-2 items-start">
              <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center mt-2">
                {idx + 1}
              </span>
              <textarea
                rows={2}
                placeholder={`Krok ${idx + 1}…`}
                value={step.text}
                onChange={(e) => onUpdateStep(step.id, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition resize-none"
              />
              <button
                onClick={() => onRemoveStep(step.id)}
                className="w-7 h-7 mt-1.5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                aria-label="Usuń krok"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={onAddStep}
          className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-800 font-medium transition"
        >
          <Plus size={13} /> Dodaj krok
        </button>
      </section>
    </div>
  );
}
