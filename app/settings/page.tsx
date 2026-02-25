import { getSettings } from '@/lib/services/SettingsService';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Ustawienia</h1>
          <p className="text-xs text-gray-400 mt-0.5">Osoby, cele kaloryczne, domyślne grupowanie</p>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-6">
        <SettingsClient initialSettings={settings} />
      </div>
    </div>
  );
}
