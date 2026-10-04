import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/lib/backupFormat.ts';

function valid() {
  return {
    app: 'expense-tracker',
    schemaVersion: 1,
    exportedAt: '2026-10-04T07:00:00.000Z',
    settings: { id: 1, openingBalance: 100000, monthStartDay: 10, monthlyBudget: null, lockEnabled: false, balancePromptDismissed: true },
    categories: [
      { id: 1, name: 'Food', kind: 'expense', icon: 'food', color: 'ember', sortOrder: 0, archived: false },
      { id: 9, name: 'Salary', kind: 'income', icon: 'wallet', color: 'emerald', sortOrder: 0, archived: false },
    ],
    presets: [{ id: 1, name: 'Lunch', categoryId: 1, amount: 35000, sortOrder: 0 }],
    transactions: [
      { id: 1, kind: 'expense', amount: 45000, categoryId: 1, date: '2026-10-03', note: 'plov', createdAt: 1, updatedAt: 1 },
      { id: 2, kind: 'income', amount: 5000000, categoryId: 9, date: '2026-10-01', note: '', createdAt: 2, updatedAt: 2 },
    ],
  };
}

function broken(mutate) {
  const b = valid();
  mutate(b);
  const r = validateBackup(b);
  assert.equal(r.ok, false);
  return r.error;
}

test('a valid backup passes unchanged', () => {
  const r = validateBackup(valid());
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup, valid());
});

test('rejects files from other apps and newer versions', () => {
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup([]).ok, false);
  assert.match(broken((b) => { b.app = 'workout-tracker'; }), /not an Expense Tracker backup/);
  assert.match(broken((b) => { b.schemaVersion = 2; }), /newer version/);
  assert.match(broken((b) => { delete b.presets; }), /presets is missing/);
});

test('names the first bad row', () => {
  assert.match(broken((b) => { b.transactions[1].amount = 1.5; }), /transactions\[1\]: amount/);
  assert.match(broken((b) => { b.transactions[0].amount = 0; }), /transactions\[0\]: amount/);
  assert.match(broken((b) => { b.transactions[0].categoryId = 9; }), /transactions\[0\]: kind does not match/);
  assert.match(broken((b) => { b.transactions[0].categoryId = 42; }), /transactions\[0\]: unknown category/);
  assert.match(broken((b) => { b.transactions[0].date = '3 Oct'; }), /transactions\[0\]: date/);
  assert.match(broken((b) => { b.transactions[1].id = 1; }), /transactions: duplicate id 1/);
  assert.match(broken((b) => { b.presets[0].categoryId = 42; }), /presets\[0\]: unknown category/);
  assert.match(broken((b) => { b.categories[0].icon = 'rocket'; }), /categories\[0\]: unknown icon/);
  assert.match(broken((b) => { b.categories[1].id = 1; }), /categories: duplicate id 1/);
  assert.match(broken((b) => { b.settings.monthStartDay = 0; }), /settings: month start day/);
  assert.match(broken((b) => { b.settings.monthlyBudget = -5; }), /settings: monthly budget/);
});

test('drops unknown fields', () => {
  const b = valid();
  b.transactions[0].extra = 'x';
  const r = validateBackup(b);
  assert.equal(r.ok, true);
  assert.equal('extra' in r.backup.transactions[0], false);
});
