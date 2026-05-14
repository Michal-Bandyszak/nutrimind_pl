import {
  MORNING_ROUTINE,
  EVENING_ROUTINE,
  POINTS_CATEGORIES,
} from '@/lib/data/healthData';
import { Section, RoutineList, PointsRow, ScaleSelector } from '@/components/health/HealthWidgets';

const WATER_GLASSES = Array.from({ length: 12 }, (_, i) => i + 1);
const SCALE_COLORS = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500'];

export type LogState = {
  morningDone: string[];
  eveningDone: string[];
  waterGlasses: number;
  sleepH: number | null;
  sleepQuality: number | null;
  energyLevel: number | null;
  moodLevel: number | null;
  pointsDiet: number | null;
  pointsSupp: number | null;
  pointsTrain: number | null;
  pointsRoutine: number | null;
  pointsRelax: number | null;
  pointsMindset: number | null;
};

type Props = {
  log: LogState;
  morningPct: number;
  eveningPct: number;
  totalPoints: number;
  onToggleMorning: (id: string) => void;
  onToggleEvening: (id: string) => void;
  onMetricChange: (patch: Partial<LogState>) => void;
  onPointChange: (patch: Partial<LogState>) => void;
};

export default function TodayTab({
  log, morningPct, eveningPct, totalPoints,
  onToggleMorning, onToggleEvening, onMetricChange, onPointChange,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Morning routine */}
      <Section
        title="Rutyna poranna"
        badge={`${log.morningDone.length}/${MORNING_ROUTINE.length}`}
        pct={morningPct}
        color="amber"
      >
        <RoutineList
          items={MORNING_ROUTINE}
          done={log.morningDone}
          onToggle={onToggleMorning}
        />
      </Section>

      {/* Evening routine */}
      <Section
        title="Rutyna wieczorna"
        badge={`${log.eveningDone.length}/${EVENING_ROUTINE.length}`}
        pct={eveningPct}
        color="violet"
      >
        <RoutineList
          items={EVENING_ROUTINE}
          done={log.eveningDone}
          onToggle={onToggleEvening}
        />
      </Section>

      {/* Daily metrics */}
      <Section title="Pomiary dnia" color="teal">
        <div className="space-y-4">
          {/* Water */}
          <div>
            <p className="text-xs text-gray-500 mb-2">💧 Woda (szklanki)</p>
            <div className="flex gap-1.5 flex-wrap">
              {WATER_GLASSES.map((n) => (
                <button
                  key={n}
                  onClick={() => onMetricChange({ waterGlasses: log.waterGlasses === n ? 0 : n })}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    n <= log.waterGlasses
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {(log.waterGlasses ?? 0) > 0 ? `${(log.waterGlasses ?? 0) * 250} ml` : 'Kliknij żeby ustawić'}
            </p>
          </div>

          {/* Sleep */}
          <div>
            <p className="text-xs text-gray-500 mb-2">😴 Sen (godziny)</p>
            <div className="flex gap-1.5 flex-wrap">
              {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((h) => (
                <button
                  key={h}
                  onClick={() => onMetricChange({ sleepH: log.sleepH === h ? null : h })}
                  className={`px-2.5 h-8 rounded-lg text-xs font-semibold transition-all ${
                    log.sleepH === h
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Energy + Mood */}
          <div className="grid grid-cols-2 gap-4">
            <ScaleSelector
              label="⚡ Energia"
              value={log.energyLevel}
              onChange={(v) => onMetricChange({ energyLevel: v })}
              colors={SCALE_COLORS}
            />
            <ScaleSelector
              label="😊 Nastrój"
              value={log.moodLevel}
              onChange={(v) => onMetricChange({ moodLevel: v })}
              colors={SCALE_COLORS}
            />
          </div>

          {/* Sleep quality */}
          <ScaleSelector
            label="⭐ Jakość snu"
            value={log.sleepQuality}
            onChange={(v) => onMetricChange({ sleepQuality: v })}
            colors={SCALE_COLORS}
            labels={['Koszmar', 'Słabo', 'OK', 'Dobrze', 'Idealnie']}
          />
        </div>
      </Section>

      {/* Points system */}
      <Section
        title="Punkty dnia — Strategia 1%"
        badge={`${totalPoints}/18`}
        color="teal"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Etap 1: max 6 pkt · Etap 2: max 12 pkt · Etap 3: max 18 pkt
          </p>
          {POINTS_CATEGORIES.map((cat) => {
            const key = `points${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}` as keyof LogState;
            const val = log[key] as number | null;
            return (
              <PointsRow
                key={cat.id}
                category={cat}
                value={val}
                onChange={(v) => onPointChange({ [key]: v })}
              />
            );
          })}

          {totalPoints > 0 && (
            <div className="pt-2 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${(totalPoints / 18) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-teal-700 tabular-nums">
                {Math.round((totalPoints / 18) * 100)}%
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
