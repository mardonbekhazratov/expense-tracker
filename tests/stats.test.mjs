import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodFor, periodsEndingWith } from '../src/lib/period.ts';
import {
  balance,
  categoryPerPeriod,
  dailyAverage,
  inPeriod,
  spendingPerDay,
  totals,
  totalsByCategory,
  totalsPerPeriod,
} from '../src/lib/stats.ts';

const tx = (kind, amount, categoryId, date) => ({ kind, amount, categoryId, date });

test('totals and balance', () => {
  const txs = [
    tx('income', 5_000_000, 9, '2026-10-01'),
    tx('expense', 45_000, 1, '2026-10-02'),
    tx('expense', 2_000, 2, '2026-10-02'),
  ];
  assert.deepEqual(totals(txs), { income: 5_000_000, spent: 47_000, net: 4_953_000 });
  assert.equal(balance(100_000, txs), 5_053_000);
  assert.equal(balance(-20_000, []), -20_000);
});

test('inPeriod keeps entries inside the period, inclusive', () => {
  const p = periodFor(2026, 10, 10);
  const txs = [tx('expense', 1, 1, '2026-10-09'), tx('expense', 2, 1, '2026-10-10'), tx('expense', 3, 1, '2026-11-09'), tx('expense', 4, 1, '2026-11-10')];
  assert.deepEqual(inPeriod(txs, p).map((t) => t.amount), [2, 3]);
});

test('totalsByCategory: one kind, largest first, with shares', () => {
  const rows = totalsByCategory(
    [
      tx('expense', 30_000, 1, '2026-10-01'),
      tx('expense', 10_000, 2, '2026-10-01'),
      tx('expense', 20_000, 1, '2026-10-02'),
      tx('expense', 10_000, 3, '2026-10-02'),
      tx('income', 999, 9, '2026-10-02'),
    ],
    'expense',
  );
  assert.deepEqual(rows.map((r) => [r.categoryId, r.amount]), [[1, 50_000], [2, 10_000], [3, 10_000]]);
  assert.ok(Math.abs(rows[0].share - 50_000 / 70_000) < 1e-9);
  assert.deepEqual(totalsByCategory([], 'expense'), []);
});

test('spendingPerDay covers every day of the period, zeros included', () => {
  const oct = periodFor(2026, 10, 1);
  const days = spendingPerDay(
    [tx('expense', 100, 1, '2026-10-03'), tx('expense', 50, 1, '2026-10-03'), tx('income', 999, 9, '2026-10-03'), tx('expense', 7, 1, '2026-11-01')],
    oct,
  );
  assert.equal(days.length, 31);
  assert.equal(days[0].date, '2026-10-01');
  assert.equal(days[30].date, '2026-10-31');
  assert.equal(days[2].spent, 150);
  assert.equal(days[0].spent, 0);

  const payday = spendingPerDay([], periodFor(2026, 10, 10));
  assert.equal(payday.length, 31);
  assert.equal(payday[0].date, '2026-10-10');
  assert.equal(payday[30].date, '2026-11-09');
});

test('dailyAverage only counts days up to today', () => {
  const days = [
    { date: '2026-10-01', spent: 100 },
    { date: '2026-10-02', spent: 0 },
    { date: '2026-10-03', spent: 50 },
    { date: '2026-10-04', spent: 1000 },
  ];
  assert.equal(dailyAverage(days, '2026-10-02'), 50);
  assert.equal(dailyAverage(days, '2026-10-31'), 288);
  assert.equal(dailyAverage(days, '2026-09-30'), 0);
});

test('totalsPerPeriod and categoryPerPeriod bucket entries by period', () => {
  const periods = periodsEndingWith(periodFor(2026, 10, 10), 2, 10);
  const txs = [
    tx('expense', 100, 1, '2026-10-09'),
    tx('expense', 200, 1, '2026-10-10'),
    tx('income', 500, 9, '2026-10-10'),
    tx('expense', 40, 2, '2026-10-12'),
  ];
  assert.deepEqual(totalsPerPeriod(txs, periods), [
    { key: '2026-09', income: 0, spent: 100, net: -100 },
    { key: '2026-10', income: 500, spent: 240, net: 260 },
  ]);
  assert.deepEqual(categoryPerPeriod(txs, 1, periods), [
    { key: '2026-09', amount: 100 },
    { key: '2026-10', amount: 200 },
  ]);
});
