'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, LogOut, Moon, Sun, User, Users } from 'lucide-react';
import type { AppSettingsData } from '@/lib/services/SettingsService';
import type { BatchConfig } from '@/lib/types';
import BatchConfigPanel from '@/components/plan/BatchConfigPanel';
import { authClient } from '@/lib/auth-client';

type Props = { initialSettings: AppSettingsData };

export default function SettingsClient({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  function updateProfile(id: string, patch: Partial<AppSettingsData['profiles'][number]>) {
    setSettings((prev) => ({
      ...prev,
      profiles: prev.profiles.map((profile) => profile.id === id ? { ...profile, ...patch } : profile),
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Błąd zapisu.');
      setSettings(json.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordMessage(null);
    const { error: authError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (authError) {
      setPasswordMessage('Nie udało się zmienić hasła. Sprawdź obecne hasło.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setPasswordMessage('Hasło zostało zmienione.');
  }

  async function handleLogout() {
    await authClient.signOut();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <AppearanceSection />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Profile żywieniowe</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {settings.profiles.map((profile) => (
            <div key={profile.id} className="panel-surface space-y-3 rounded-[1.5rem] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
                  <User size={14} className="text-teal-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {profile.isPrimary ? 'Profil główny' : 'Wspólny profil'}
                </span>
              </div>
              <label className="block text-xs text-gray-500">
                Imię
                <input
                  value={profile.name}
                  maxLength={30}
                  onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                  className="input-base mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-gray-500">
                Cel kaloryczny
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    step={50}
                    value={profile.targetKcal}
                    onChange={(e) => updateProfile(profile.id, { targetKcal: Number(e.target.value) })}
                    className="input-base w-full rounded-xl px-3 py-2 pr-12 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kcal</span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </section>

      {settings.profiles.length > 1 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Tryb planowania</h2>
          <div className="panel-surface grid grid-cols-2 gap-2 rounded-[1.5rem] p-2">
            <ModeButton
              active={settings.planMode === 'shared'}
              label="Plan wspólny"
              icon={<Users size={17} />}
              onClick={() => setSettings((prev) => ({ ...prev, planMode: 'shared' }))}
            />
            <ModeButton
              active={settings.planMode === 'solo'}
              label="Tylko profil główny"
              icon={<User size={17} />}
              onClick={() => setSettings((prev) => ({ ...prev, planMode: 'solo' }))}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">Zmiana zostanie użyta przy generowaniu następnego planu.</p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Domyślne grupowanie</h2>
        <div className="panel-surface rounded-[1.5rem] p-4">
          <BatchConfigPanel
            config={settings.defaultBatchConfig}
            onChange={(config: BatchConfig) => setSettings((prev) => ({ ...prev, defaultBatchConfig: config }))}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}
        </button>
        {saved && <span className="text-sm font-medium text-teal-600">Zapisano</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Konto</h2>
        <div className="panel-surface space-y-3 rounded-[1.5rem] p-4">
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Obecne hasło" className="input-base w-full rounded-xl px-3 py-2 text-sm" />
          <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nowe hasło (min. 8 znaków)" className="input-base w-full rounded-xl px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePasswordChange} disabled={!currentPassword || newPassword.length < 8} className="rounded-xl bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 disabled:opacity-50">
              Zmień hasło
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
              <LogOut size={15} /> Wyloguj
            </button>
          </div>
          {passwordMessage && <p className="text-xs text-gray-500">{passwordMessage}</p>}
        </div>
      </section>
    </div>
  );
}

function ModeButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium ${active ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
      {icon}{label}
    </button>
  );
}

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
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('nutrimind-theme', next ? 'dark' : 'light');
  }
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Wygląd</h2>
      <div className="panel-surface flex items-center justify-between rounded-[1.5rem] p-4">
        <div className="flex items-center gap-3">
          {isDark ? <Moon size={18} className="text-teal-600" /> : <Sun size={18} className="text-amber-500" />}
          <span className="text-sm font-medium text-gray-900">Tryb ciemny</span>
        </div>
        <button onClick={toggleTheme} disabled={!mounted} role="switch" aria-checked={isDark} className={`h-7 w-12 rounded-full transition-colors ${isDark ? 'bg-teal-600' : 'bg-gray-200'}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </section>
  );
}
