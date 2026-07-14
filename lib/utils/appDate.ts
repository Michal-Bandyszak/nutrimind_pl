export const APP_TIME_ZONE = 'Europe/Warsaw';

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function todayInAppTimeZone(now = new Date()): string {
  const { year, month, day } = dateParts(now);
  return `${year}-${month}-${day}`;
}

export function currentWeekStart(now = new Date()): Date {
  const today = new Date(`${todayInAppTimeZone(now)}T00:00:00.000Z`);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  today.setUTCDate(today.getUTCDate() - daysSinceMonday);
  return today;
}

export function isCurrentPlanWeek(weekStart: Date | string, now = new Date()): boolean {
  const start = new Date(weekStart);
  return !Number.isNaN(start.getTime())
    && start.toISOString().slice(0, 10) === currentWeekStart(now).toISOString().slice(0, 10);
}

export function currentPlanDayOfWeek(weekStart: Date | string, now = new Date()): number | null {
  if (!isCurrentPlanWeek(weekStart, now)) return null;
  const today = new Date(`${todayInAppTimeZone(now)}T00:00:00.000Z`);
  return today.getUTCDay() || 7;
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
