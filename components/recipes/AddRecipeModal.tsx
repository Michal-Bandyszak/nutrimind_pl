'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import { CATEGORIES, VALID_TYPES } from '@/lib/utils/recipeConstants';
import type {
  FileData,
  IngredientRow,
  StepRow,
  UploadQualityIssue,
  UploadQualityState,
  UploadRecipeDraft,
} from './types';
import UploadTab, { LLM_PROMPT } from './UploadTab';
import ManualTab from './ManualTab';

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  onSaved: (recipe: RecipeWithIngredients) => void;
};

function genId() {
  return Math.random().toString(36).slice(2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function toNumberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toBooleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function parseUploadRecipe(text: string): UploadRecipeDraft | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;

  const name = toStringOrNull(raw.name)?.trim() ?? '';
  const type = toStringOrNull(raw.type) ?? '';
  const prepTimeMin = toNumberOrNull(raw.prepTimeMin);
  const cookTimeMin = toNumberOrNull(raw.cookTimeMin);
  const batchFriendly = toBooleanOrDefault(raw.batchFriendly, false);
  const maxStorageDays = toNumberOrNull(raw.maxStorageDays) ?? 1;
  const baseServings = toNumberOrNull(raw.baseServings) ?? undefined;
  const ingredientBasis = raw.ingredientBasis === 'per-serving' || raw.ingredientBasis === 'per-whole'
    ? raw.ingredientBasis
    : undefined;
  const kcalPerServing = toNumberOrNull(raw.kcalPerServing);
  const proteinG = toNumberOrNull(raw.proteinG);
  const carbsG = toNumberOrNull(raw.carbsG);
  const fatG = toNumberOrNull(raw.fatG);
  const fiberG = toNumberOrNull(raw.fiberG);
  const instructions = Array.isArray(raw.instructions)
    ? raw.instructions.filter((step): step is string => typeof step === 'string').map((step) => step.trim()).filter(Boolean)
    : [];
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.filter(isRecord).map((ingredient) => {
      const category = typeof ingredient.category === 'string' && CATEGORIES.includes(ingredient.category as typeof CATEGORIES[number])
        ? ingredient.category
        : 'other';
      return {
        name: toStringOrNull(ingredient.name)?.trim() ?? '',
        amountG: toNumberOrNull(ingredient.amountG),
        displayText: toStringOrNull(ingredient.displayText) ?? undefined,
        category,
        scalesLinearly: toBooleanOrDefault(ingredient.scalesLinearly, true),
      };
    })
    : [];

  if (!name || !VALID_TYPES.includes(type as typeof VALID_TYPES[number]) || ingredients.length === 0) {
    return null;
  }

  return {
    name,
    type,
    prepTimeMin,
    cookTimeMin,
    batchFriendly,
    maxStorageDays,
    baseServings,
    ingredientBasis,
    kcalPerServing,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    instructions,
    ingredients,
  };
}

function hasFullMacros(recipe: UploadRecipeDraft) {
  return [recipe.kcalPerServing, recipe.proteinG, recipe.carbsG, recipe.fatG].every(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
}

function buildUploadQuality(
  recipe: UploadRecipeDraft | null,
  uploadBasis: 'per-serving' | 'per-whole',
  uploadBaseServings: string,
): UploadQualityState {
  const issues: UploadQualityIssue[] = [];

  if (!recipe) {
    return {
      hasMacros: false,
      missingAmountCount: 0,
      baseServingsValue: Number(uploadBaseServings) || 1,
      perWholeValid: uploadBasis !== 'per-whole' || Number(uploadBaseServings) > 1,
      canSave: false,
      issues,
    };
  }

  const missingAmountCount = recipe.ingredients.filter((ingredient) => typeof ingredient.amountG !== 'number' || !Number.isFinite(ingredient.amountG) || ingredient.amountG <= 0).length;
  const hasMacros = hasFullMacros(recipe);
  const baseServingsValue = Number(uploadBaseServings) || Number(recipe.baseServings) || 1;
  const perWholeValid = uploadBasis !== 'per-whole' || baseServingsValue > 1;
  const canSave = missingAmountCount === 0 && perWholeValid;

  if (!hasMacros) {
    issues.push({
      id: 'macros',
      level: 'warning',
      title: 'Brak makro',
      detail: 'Kcal, białko, węglowodany i tłuszcz będą potrzebne, jeśli przepis ma być później zweryfikowany do generatora planu.',
    });
  }

  if (missingAmountCount > 0) {
    issues.push({
      id: 'amounts',
      level: 'error',
      title: 'Brak amountG',
      detail: 'Każdy składnik musi mieć ilość w gramach, żeby zapis był poprawny.',
    });
  }

  if (!perWholeValid) {
    issues.push({
      id: 'servings',
      level: 'error',
      title: 'Za mało porcji',
      detail: 'Tryb "cała receptura" wymaga baseServings większego niż 1.',
    });
  }

  return {
    hasMacros,
    missingAmountCount,
    baseServingsValue,
    perWholeValid,
    canSave,
    issues,
  };
}

function buildUploadPayload(
  recipe: UploadRecipeDraft,
  uploadBasis: 'per-serving' | 'per-whole',
  uploadBaseServings: string,
): FileData {
  return {
    ...recipe,
    ingredientBasis: uploadBasis,
    baseServings: Number(uploadBaseServings) || 1,
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amountG: ingredient.amountG ?? 0,
      displayText: ingredient.displayText,
      category: ingredient.category,
      scalesLinearly: ingredient.scalesLinearly,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AddRecipeModal({ onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload tab
  const [copied, setCopied] = useState(false);
  const [fileData, setFileData] = useState<UploadRecipeDraft | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
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

    const parsed = parseUploadRecipe(trimmed);
    if (!parsed) {
      setFileError('Błąd parsowania lub brak wymaganych pól. Sprawdź, czy to poprawny JSON z name, type i ingredients.');
      setFileData(null);
      return;
    }

    setFileError(null);
    setFileData(parsed);

    if (parsed.ingredientBasis === 'per-whole') {
      setUploadBasis('per-whole');
      setUploadBaseServings(String(parsed.baseServings ?? 1));
    } else {
      setUploadBasis('per-serving');
      setUploadBaseServings(String(parsed.baseServings ?? 1));
    }
  }

  function buildPayloadFromForm(): FileData | null {
    if (!name.trim()) { setError('Nazwa przepisu jest wymagana.'); return null; }
    const validIngredients = ingredients.filter((i) => i.name.trim() && i.amountG);
    if (validIngredients.length === 0) { setError('Wymagany co najmniej 1 składnik z nazwą i ilością.'); return null; }
    const isValidNum = (v: string) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;
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
      proteinG: isValidNum(protein) ? Number(protein) : null,
      carbsG: isValidNum(carbs) ? Number(carbs) : null,
      fatG: isValidNum(fat) ? Number(fat) : null,
      fiberG: isValidNum(fiber) ? Number(fiber) : null,
      instructions: steps.map((s) => s.text).filter(Boolean),
      ingredients: validIngredients.map((i) => ({
        name: i.name.trim(),
        amountG: Number(i.amountG),
        category: i.category,
        scalesLinearly: i.scalesLinearly,
      })),
    };
  }

  const uploadQuality = useMemo(
    () => buildUploadQuality(fileData, uploadBasis, uploadBaseServings),
    [fileData, uploadBasis, uploadBaseServings],
  );

  async function handleSave() {
    setError(null);
    let payload: FileData | null;
    if (activeTab === 'upload') {
      if (!fileData || !uploadQuality.canSave) return;
      payload = buildUploadPayload(fileData, uploadBasis, uploadBaseServings);
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

  const isSaveDisabled = saving || (activeTab === 'upload' ? !fileData || !uploadQuality.canSave : false);

  const content = (
    <div
      className="modal-scrim fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Dodaj przepis</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border shrink-0">
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
              quality={uploadQuality}
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
              onAddIngredient={() => setIngredients((prev) => [...prev, { id: genId(), name: '', amountG: '', category: 'other', scalesLinearly: true }])}
              onRemoveIngredient={(id) => setIngredients((prev) => prev.filter((i) => i.id !== id))}
              onUpdateIngredient={(id, field, value) => setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))}
              steps={steps}
              onAddStep={() => setSteps((prev) => [...prev, { id: genId(), text: '' }])}
              onRemoveStep={(id) => setSteps((prev) => prev.filter((s) => s.id !== id))}
              onUpdateStep={(id, text) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {error ? (
            <p className="text-sm text-red-500 flex-1">{error}</p>
          ) : (
            <span className="flex-1" />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-sm rounded-2xl transition"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
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
