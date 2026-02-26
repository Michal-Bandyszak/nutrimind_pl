'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, User, Sun, Moon } from 'lucide-react';
import type { AppSettingsData } from '@/lib/services/SettingsService';
import type { BatchConfig } from '@/lib/types';
import BatchConfigPanel from '@/components/plan/BatchConfigPanel';

type Props = { initialSettings: AppSettingsData };

export default function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<AppSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Błąd zapisu.');
      setSettings(json.data as AppSettingsData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <AppearanceSection />

      {/* ── People ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Osoby</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PersonCard
            label="Osoba A"
            name={settings.personAName}
            kcal={settings.personAKcal}
            onNameChange={(v) => setField('personAName', v)}
            onKcalChange={(v) => setField('personAKcal', v)}
          />
          <PersonCard
            label="Osoba B"
            name={settings.personBName}
            kcal={settings.personBKcal}
            onNameChange={(v) => setField('personBName', v)}
            onKcalChange={(v) => setField('personBKcal', v)}
          />
        </div>
      </section>

      {/* ── Default batch config ────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Domyślne grupowanie</h2>
          <p className="text-xs text-gray-400 mt-1">
            Używane przy generowaniu nowego planu (można zmienić per-plan).
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <BatchConfigPanel
            config={settings.defaultBatchConfig}
            onChange={(cfg: BatchConfig) => setField('defaultBatchConfig', cfg)}
          />
        </div>
      </section>

      {/* ── Save button ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}
        </button>

        {saved && (
          <span className="text-sm text-teal-600 font-medium">Zapisano</span>
        )}
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}

// ── PersonCard ──────────────────────────────────────────────────────────────

type PersonCardProps = {
  label: string;
  name: string;
  kcal: number;
  onNameChange: (v: string) => void;
  onKcalChange: (v: number) => void;
};

function AppearanceSection() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nutrimind-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nutrimind-theme', 'light');
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Wygląd</h2>
      <div className="bg-white rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDark ? (
              <Moon size={18} className="text-indigo-400" />
            ) : (
              <Sun size={18} className="text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDark ? 'Tryb ciemny' : 'Tryb jasny'}
              </p>
              <p className="text-xs text-gray-400">Przełącz motyw aplikacji</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              isDark ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full shadow-sm transition-transform ${
                isDark ? 'translate-x-[22px] bg-gray-900' : 'translate-x-[2px] bg-white'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

function PersonCard({ label, name, kcal, onNameChange, onKcalChange }: PersonCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center">
          <User size={14} className="text-teal-600" />
        </div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-500">Imię</label>
        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          placeholder="Imię osoby"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-500">Cel kaloryczny</label>
        <div className="relative">
          <input
            type="number"
            value={kcal}
            min={800}
            max={6000}
            step={50}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) onKcalChange(v);
            }}
            className="w-full px-3 py-2 pr-12 rounded-xl border border-border bg-surface text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            kcal
          </span>
        </div>
        <p className="text-xs text-gray-400">800–6000 kcal</p>
      </div>
    </div>
  );
}
