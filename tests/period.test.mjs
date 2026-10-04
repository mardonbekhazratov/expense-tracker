import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysISO } from '../src/lib/dates.ts';
import {
  periodContaining,
  periodFor,
  periodLabel,
  periodRangeLabel,
  periodShortLabel,
  periodsEndingWith,
  shiftPeriod,
} from '../src/lib/period.ts';

test('start day 1 gives calendar months', () => {
  assert.deepEqual(periodContaining('2026-10-04', 1), {
    key: '2026-10', year: 2026, month: 10, start: '2026-10-01', end: '2026-10-31',
  });
});

test('a payday start splits months and is labelled by the month it starts in', () => {
  assert.equal(periodContaining('2026-10-04', 10).key, '2026-09');
  assert.equal(periodContaining('2026-10-04', 10).start, '2026-09-10');
  assert.equal(periodContaining('2026-10-04', 10).end, '2026-10-09');
  assert.equal(periodContaining('2026-10-10', 10).key, '2026-10');
  assert.equal(periodContaining('2026-10-10', 10).end, '2026-11-09');
});

test('start days past the end of a month clamp to its last day', () => {
  assert.equal(periodFor(2026, 2, 31).start, '2026-02-28');
  assert.equal(periodFor(2026, 2, 31).end, '2026-03-30');
  assert.equal(periodFor(2026, 1, 31).end, '2026-02-27');
  assert.equal(periodFor(2028, 2, 31).start, '2028-02-29');
  assert.equal(periodFor(2028, 2, 30).start, '2028-02-29');
  assert.equal(periodContaining('2026-03-15', 31).key, '2026-02');
});

test('periods cross year boundaries', () => {
  const p = periodContaining('2027-01-05', 10);
  assert.equal(p.key, '2026-12');
  assert.equal(p.start, '2026-12-10');
  assert.equal(p.end, '2027-01-09');
  assert.equal(shiftPeriod(periodFor(2026, 12, 1), 1, 1).key, '2027-01');
  assert.equal(shiftPeriod(periodFor(2026, 12, 1), -12, 1).key, '2025-12');
});

test('every day belongs to exactly one period, with no gaps', () => {
  for (const startDay of [1, 15, 28, 29, 30, 31]) {
    let p = periodFor(2027, 1, startDay);
    for (let i = 0; i < 30; i++) {
      const next = shiftPeriod(p, 1, startDay);
      assert.equal(addDaysISO(p.end, 1), next.start, `start day ${startDay}, after ${p.key}`);
      assert.ok(p.start <= p.end);
      p = next;
    }
  }
});

test('changing the start day re-buckets the same date', () => {
  assert.equal(periodContaining('2026-10-15', 1).key, '2026-10');
  assert.equal(periodContaining('2026-10-15', 20).key, '2026-09');
});

test('periodsEndingWith returns the last N periods, oldest first', () => {
  const list = periodsEndingWith(periodFor(2026, 3, 1), 12, 1);
  assert.equal(list.length, 12);
  assert.equal(list[0].key, '2025-04');
  assert.equal(list[11].key, '2026-03');
});

test('labels', () => {
  const p = periodFor(2026, 10, 10);
  assert.equal(periodLabel(p), 'Oct 2026');
  assert.equal(periodShortLabel(p), 'Oct');
  assert.equal(periodRangeLabel(p), '10 Oct – 9 Nov');
});
