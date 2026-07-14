import { strict as assert } from 'node:assert';
import {
  currentPlanDayOfWeek,
  currentWeekStart,
  isValidDateKey,
  todayInAppTimeZone,
} from '../lib/utils/appDate';

const justAfterMidnightInWarsaw = new Date('2026-07-14T22:30:00.000Z');

assert.equal(todayInAppTimeZone(justAfterMidnightInWarsaw), '2026-07-15');
assert.equal(currentWeekStart(justAfterMidnightInWarsaw).toISOString(), '2026-07-13T00:00:00.000Z');
assert.equal(currentPlanDayOfWeek('2026-07-13T00:00:00.000Z', justAfterMidnightInWarsaw), 3);
assert.equal(isValidDateKey('2024-02-29'), true);
assert.equal(isValidDateKey('2026-02-29'), false);

console.log('Core date checks passed.');
