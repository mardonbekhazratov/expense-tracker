import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  daysInMonth,
  formatDayHeading,
  formatShortDate,
  msUntilMidnight,
  parseISODate,
  toISODate,
  todayISO,
} from '../src/lib/dates.ts';

test('toISODate and todayISO use the local calendar date', () => {
  assert.equal(toISODate(new Date(2026, 9, 4, 23, 59)), '2026-10-04');
  assert.equal(todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});

test('parseISODate and daysInMonth', () => {
  assert.deepEqual(parseISODate('2026-10-04'), { y: 2026, m: 10, d: 4 });
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 12), 31);
});

test('addDaysISO crosses months and years', () => {
  assert.equal(addDaysISO('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysISO('2026-01-01', -1), '2025-12-31');
  assert.equal(addDaysISO('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysISO('2026-03-29', 3), '2026-04-01');
});

test('formatShortDate and formatDayHeading', () => {
  assert.equal(formatShortDate('2026-10-05'), '5 Oct');
  assert.equal(formatDayHeading('2026-10-04', '2026-10-04'), 'Today');
  assert.equal(formatDayHeading('2026-10-03', '2026-10-04'), 'Yesterday');
  assert.equal(formatDayHeading('2026-10-01', '2026-10-04'), 'Thu, 1 Oct');
  assert.equal(formatDayHeading('2025-12-30', '2026-10-04'), 'Tue, 30 Dec 2025');
});

test('msUntilMidnight counts down to the next local day', () => {
  assert.equal(msUntilMidnight(new Date(2026, 9, 4, 23, 59, 0)), 60_000);
  assert.equal(msUntilMidnight(new Date(2026, 9, 4, 0, 0, 0)), 24 * 3600_000);
});
