import { Plus, Trash2 } from 'lucide-react';
import IngredientBasisPicker from './IngredientBasisPicker';
import { VALID_TYPES, MEAL_TYPE_LABELS, CATEGORIES, CATEGORY_LABELS } from '@/lib/utils/recipeConstants';
import type { IngredientRow, StepRow } from './types';

type Props = {
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
};

export default function ManualTab({
  name, setName, type, setType,
  prepTimeMin, setPrepTimeMin,
  batchFriendly, setBatchFriendly, maxStorageDays, setMaxStorageDays,
  manualBasis, setManualBasis, manualBaseServings, setManualBaseServings,
  kcal, setKcal, protein, setProtein, carbs, setCarbs, fat, setFat, fiber, setFiber,
  ingredients, onAddIngredient, onRemoveIngredient, onUpdateIngredient,
  steps, onAddStep, onRemoveStep, onUpdateStep,
}: Props) {
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
            className="input-base w-full px-3 py-2 rounded-xl text-sm placeholder:text-gray-300"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Typ *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-base w-full px-3 py-2 rounded-xl text-sm"
          >
            {VALID_TYPES.map((t) => (
              <option key={t} value={t}>{MEAL_TYPE_LABELS[t] ?? t}</option>
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
              className="input-base w-full px-3 py-2 rounded-xl text-sm"
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
              className="input-base w-16 px-2 py-1.5 rounded-lg text-sm"
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
              className="input-base w-full px-3 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Białko (g) *</label>
            <input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)}
              className="input-base w-full px-3 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Węglowodany (g) *</label>
            <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)}
              className="input-base w-full px-3 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tłuszcze (g) *</label>
            <input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)}
              className="input-base w-full px-3 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Błonnik (g)</label>
            <input type="number" min="0" value={fiber} onChange={(e) => setFiber(e.target.value)}
              className="input-base w-full px-3 py-2 rounded-xl text-sm" />
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
                className="input-base px-3 py-2 rounded-xl text-sm placeholder:text-gray-300"
              />
              <input
                type="number"
                placeholder="g"
                min="0"
                value={ing.amountG}
                onChange={(e) => onUpdateIngredient(ing.id, 'amountG', e.target.value)}
                className="input-base px-3 py-2 rounded-xl text-sm placeholder:text-gray-300"
              />
              <select
                value={ing.category}
                onChange={(e) => onUpdateIngredient(ing.id, 'category', e.target.value)}
                className="input-base px-2 py-2 rounded-xl text-sm"
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
                className="input-base flex-1 px-3 py-2 rounded-xl text-sm placeholder:text-gray-300 resize-none"
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
