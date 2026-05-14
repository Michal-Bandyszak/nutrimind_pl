'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, User, Moon, Sun } from 'lucide-react';
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
        <div className="panel-surface rounded-[1.5rem] p-4">
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
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium active:scale-95 transition-all disabled:opacity-60"
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
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next ? '#121714' : '#f4efe4');
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Wygląd</h2>
      <div className="panel-surface rounded-[1.5rem] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
              <Moon size={18} className="text-teal-600 shrink-0" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Tryb ciemny</p>
              <p className="text-xs text-gray-400 mt-0.5">Ciepły motyw nocny z oliwkowym akcentem</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label="Tryb ciemny"
            disabled={!mounted}
            className={`relative w-12 h-7 shrink-0 rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              isDark && mounted ? 'bg-teal-600 border-teal-700' : 'bg-gray-200 border-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#fffdf8] shadow-sm transition-transform duration-200 ${
                isDark && mounted ? 'translate-x-[22px]' : 'translate-x-0'
              }`}
            >
              {isDark && mounted ? <Moon size={12} className="text-teal-700" /> : <Sun size={12} className="text-amber-500" />}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function PersonCard({ label, name, kcal, onNameChange, onKcalChange }: PersonCardProps) {
  return (
    <div className="panel-surface rounded-[1.5rem] p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
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
          className="input-base w-full px-3 py-2 rounded-xl text-sm placeholder:text-gray-300"
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
            className="input-base w-full px-3 py-2 pr-12 rounded-xl text-sm"
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
