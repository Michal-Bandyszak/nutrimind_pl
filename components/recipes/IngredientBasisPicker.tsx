type Props = {
  basis: 'per-serving' | 'per-whole';
  onBasisChange: (v: 'per-serving' | 'per-whole') => void;
  baseServings: string;
  onBaseServingsChange: (v: string) => void;
};

export default function IngredientBasisPicker({
  basis, onBasisChange, baseServings, onBaseServingsChange,
}: Props) {
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-amber-700">Składniki podane na:</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onBasisChange('per-serving')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium border transition ${
            basis === 'per-serving'
              ? 'bg-teal-800 text-white border-teal-700'
              : 'bg-white text-gray-500 border-border hover:border-teal-300'
          }`}
        >
          1 porcję
        </button>
        <button
          type="button"
          onClick={() => onBasisChange('per-whole')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium border transition ${
            basis === 'per-whole'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-500 border-border hover:border-amber-300'
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
            className="input-base w-20 px-2 py-1 rounded-xl text-sm"
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
