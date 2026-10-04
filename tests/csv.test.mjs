import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv } from '../src/lib/csv.ts';

const tx = (o) => ({ id: 1, kind: 'expense', amount: 1000, categoryId: 1, date: '2026-10-01', note: '', createdAt: 0, updatedAt: 0, ...o });
const names = (id) => ({ 1: 'Food', 2: 'Bills, utilities', 9: 'Salary' })[id];
const lines = (csv) => csv.slice(1).split('\r\n');

test('starts with a byte-order mark and a header row', () => {
  assert.equal(buildCsv([], names), '﻿Date,Type,Category,Amount,Note\r\n');
});

test('rows are sorted oldest first and typed', () => {
  const csv = buildCsv(
    [
      tx({ date: '2026-10-02', createdAt: 5, amount: 300 }),
      tx({ kind: 'income', categoryId: 9, date: '2026-10-01', createdAt: 9, amount: 5000000 }),
      tx({ date: '2026-10-02', createdAt: 1, amount: 200 }),
    ],
    names,
  );
  assert.deepEqual(lines(csv), [
    'Date,Type,Category,Amount,Note',
    '2026-10-01,Income,Salary,5000000,',
    '2026-10-02,Expense,Food,200,',
    '2026-10-02,Expense,Food,300,',
    '',
  ]);
});

test('quotes commas, quotes and newlines; keeps Cyrillic', () => {
  const csv = buildCsv([tx({ categoryId: 2, note: 'Svet, gaz "oktabr"\nоплата' })], names);
  assert.equal(lines(csv)[1], '2026-10-01,Expense,"Bills, utilities",1000,"Svet, gaz ""oktabr""\nоплата"');
});
