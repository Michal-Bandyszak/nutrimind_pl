'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { RecipeWithIngredients } from '@/lib/types';
import { VALID_TYPES } from '@/lib/utils/recipeConstants';
import type { FileData, IngredientRow, StepRow } from './types';
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
