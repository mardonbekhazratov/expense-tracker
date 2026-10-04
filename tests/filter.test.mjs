import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_FILTER, filterTransactions, groupByDay } from '../src/lib/filter.ts';

const tx = (id, o) => ({ id, kind: 'expense', amount: 1000, categoryId: 1, date: '2026-10-01', note: '', createdAt: id, updatedAt: id, ...o });
const names = (id) => ({ 1: 'Food', 2: 'Transport', 9: 'Salary' })[id] ?? '';

const txs = [
  tx(1, { note: 'ОБЕД с друзьями' }),
  tx(2, { categoryId: 2, note: 'metro' }),
  tx(3, { kind: 'income', categoryId: 9, amount: 5000000 }),
];

test('filters by kind, category and text in note or category name', () => {
  const ids = (f) => filterTransactions(txs, { ...EMPTY_FILTER, ...f }, names).map((t) => t.id);
  assert.deepEqual(ids({}), [1, 2, 3]);
  assert.deepEqual(ids({ kind: 'income' }), [3]);
  assert.deepEqual(ids({ categoryId: 2 }), [2]);
  assert.deepEqual(ids({ query: '  обед ' }), [1]);
  assert.deepEqual(ids({ query: 'TRANS' }), [2]);
  assert.deepEqual(ids({ query: 'sal', kind: 'expense' }), []);
});

test('groupByDay: newest day first, newest entry first, net per day', () => {
  const groups = groupByDay([
    tx(1, { date: '2026-10-01', amount: 300 }),
    tx(2, { date: '2026-10-03', amount: 100 }),
    tx(3, { date: '2026-10-01', kind: 'income', categoryId: 9, amount: 1000 }),
    tx(4, { date: '2026-10-03', amount: 50 }),
  ]);
  assert.deepEqual(groups.map((g) => [g.date, g.items.map((t) => t.id), g.net]), [
    ['2026-10-03', [4, 2], -150],
    ['2026-10-01', [3, 1], 700],
  ]);
  assert.deepEqual(groupByDay([]), []);
});
