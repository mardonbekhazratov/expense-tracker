// fake-indexeddb must load before Dexie so Dexie picks up its globals.
import 'fake-indexeddb/auto';
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/db.ts';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, seedIfEmpty } from '../src/db/seed.ts';
import * as q from '../src/db/queries.ts';
import { createBackup, createCsv, restoreBackup } from '../src/db/backupData.ts';

const NOW = new Date(2026, 9, 4, 12, 0, 0); // Sun 4 Oct 2026, local noon
const at = (hour) => new Date(2026, 9, 4, hour, 0, 0);

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedIfEmpty();
});

async function cat(name, kind = 'expense') {
  const c = (await q.listCategories(kind, { includeArchived: true })).find((x) => x.name === name);
  assert.ok(c, `category ${name}`);
  return c;
}

async function addExpense(amount, categoryName = 'Food', date = '2026-10-04', note = '', now = NOW) {
  const c = await cat(categoryName);
  return q.addTransaction({ kind: 'expense', amount, categoryId: c.id, date, note }, now);
}

test('seeding creates settings and default categories once', async () => {
  assert.deepEqual(await q.getSettings(), DEFAULT_SETTINGS);
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length);
  await seedIfEmpty();
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length);
  // Deleting a default must not make it come back on the next launch.
  await q.deleteCategory((await cat('Shopping')).id);
  await seedIfEmpty();
  assert.equal(await db.categories.count(), DEFAULT_CATEGORIES.length - 1);
});

test('addTransaction rejects bad input', async () => {
  const food = await cat('Food');
  const base = { kind: 'expense', amount: 1000, categoryId: food.id, date: '2026-10-04', note: '' };
  await assert.rejects(q.addTransaction({ ...base, amount: 0 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, amount: 1.5 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, amount: 1e12 }, NOW), /positive whole number/);
  await assert.rejects(q.addTransaction({ ...base, kind: 'income' }, NOW), /does not match/);
  await assert.rejects(q.addTransaction({ ...base, categoryId: 999 }, NOW), /Category not found/);
  await assert.rejects(q.addTransaction({ ...base, date: '2026-10-05' }, NOW), /future/);
  assert.equal(await db.transactions.count(), 0);
});

test('addTransaction trims the note and stamps times', async () => {
  const id = await addExpense(45000, 'Food', '2026-10-04', '  plov  ');
  const t = await db.transactions.get(id);
  assert.equal(t.note, 'plov');
  assert.equal(t.createdAt, NOW.getTime());
  assert.equal(t.updatedAt, NOW.getTime());
});

test('recentTransactions orders by date, then creation time', async () => {
  const a = await addExpense(1, 'Food', '2026-10-03', '', at(8));
  const b = await addExpense(2, 'Food', '2026-10-01', '', at(9));
  const c = await addExpense(3, 'Food', '2026-10-03', '', at(10));
  assert.deepEqual((await q.recentTransactions(10)).map((t) => t.id), [c, a, b]);
  assert.deepEqual((await q.recentTransactions(2)).map((t) => t.id), [c, a]);
});

test('editing an expense into income moves it between totals', async () => {
  const id = await addExpense(50000);
  assert.deepEqual(await q.periodTotals('2026-10-01', '2026-10-31'), { income: 0, spent: 50000, net: -50000 });
  const salary = await cat('Salary', 'income');
  await q.updateTransaction(id, { kind: 'income', amount: 50000, categoryId: salary.id, date: '2026-10-04', note: '' }, NOW);
  assert.deepEqual(await q.periodTotals('2026-10-01', '2026-10-31'), { income: 50000, spent: 0, net: 50000 });
  await assert.rejects(q.updateTransaction(9999, { kind: 'income', amount: 1, categoryId: salary.id, date: '2026-10-04', note: '' }, NOW), /not found/);
});

test('withBudgetCheck reports crossings for adds, edits and date moves', async () => {
  await q.updateSettings({ monthlyBudget: 100000 });
  assert.equal(await q.withBudgetCheck(() => addExpense(70000), NOW), null);
  let id = 0;
  assert.equal((await q.withBudgetCheck(async () => { id = await addExpense(15000); }, NOW))?.level, 'warning');
  const food = await cat('Food');
  const edit = (o) => q.updateTransaction(id, { kind: 'expense', amount: 15000, categoryId: food.id, date: '2026-10-04', note: '', ...o }, NOW);
  assert.equal((await q.withBudgetCheck(() => edit({ amount: 200000 }), NOW))?.level, 'over');
  // Moving the entry out of this month drops spending: no warning.
  assert.equal(await q.withBudgetCheck(() => edit({ date: '2026-09-30' }), NOW), null);
  // Moving it back in crosses straight to "warning" again (70 000 + 15 000).
  assert.equal((await q.withBudgetCheck(() => edit({ date: '2026-10-02' }), NOW))?.level, 'warning');
  assert.equal(await q.withBudgetCheck(() => q.deleteTransaction(id), NOW), null);
});

test('category names are trimmed and unique per kind, ignoring case', async () => {
  const id = await q.addCategory({ name: '  Taxi   rides ', kind: 'expense', icon: 'car', color: 'sky' });
  assert.equal((await db.categories.get(id)).name, 'Taxi rides');
  await assert.rejects(q.addCategory({ name: 'taxi RIDES', kind: 'expense', icon: 'car', color: 'sky' }), /already exists/);
  await q.addCategory({ name: 'Taxi rides', kind: 'income', icon: 'car', color: 'sky' });
  await assert.rejects(q.addCategory({ name: '   ', kind: 'expense', icon: 'car', color: 'sky' }), /Name is required/);
  await assert.rejects(q.updateCategory(id, { name: 'food', icon: 'car', color: 'sky' }), /already exists/);
  await q.updateCategory(id, { name: 'Taxi', icon: 'car', color: 'amber' });
  assert.equal((await db.categories.get(id)).name, 'Taxi');
});

test('hidden categories leave pickers but still label old entries', async () => {
  await addExpense(45000, 'Food');
  const food = await cat('Food');
  await q.setCategoryArchived(food.id, true);
  assert.equal((await q.listCategories('expense')).some((c) => c.name === 'Food'), false);
  assert.equal((await q.listCategories('expense', { includeArchived: true })).some((c) => c.name === 'Food'), true);
  assert.match(await createCsv(), /,Expense,Food,45000,/);
  await assert.rejects(q.addCategory({ name: 'food', kind: 'expense', icon: 'food', color: 'ember' }), /hidden/);
});

test('deleteCategory refuses categories in use', async () => {
  await addExpense(1000, 'Food');
  await assert.rejects(q.deleteCategory((await cat('Food')).id), /in use/);
  const transport = await cat('Transport');
  await q.addPreset({ name: 'Metro', categoryId: transport.id, amount: 2000 });
  await assert.rejects(q.deleteCategory(transport.id), /in use/);
  const health = await cat('Health');
  await q.deleteCategory(health.id);
  assert.equal(await db.categories.get(health.id), undefined);
});

test('moveCategory swaps neighbours and ignores moves past the ends', async () => {
  const before = (await q.listCategories('expense')).map((c) => c.name);
  const second = await cat(before[1]);
  await q.moveCategory(second.id, -1);
  const after = (await q.listCategories('expense')).map((c) => c.name);
  assert.deepEqual(after.slice(0, 2), [before[1], before[0]]);
  await q.moveCategory(second.id, -1);
  assert.deepEqual((await q.listCategories('expense')).map((c) => c.name), after);
});

test('logPreset adds a dated entry with the preset name as note; undo deletes it', async () => {
  const transport = await cat('Transport');
  const metro = await q.addPreset({ name: 'Metro', categoryId: transport.id, amount: 2000 });
  const txId = await q.logPreset(metro, NOW);
  const t = await db.transactions.get(txId);
  assert.deepEqual(
    { kind: t.kind, amount: t.amount, categoryId: t.categoryId, date: t.date, note: t.note },
    { kind: 'expense', amount: 2000, categoryId: transport.id, date: '2026-10-04', note: 'Metro' },
  );
  await q.deleteTransaction(txId);
  assert.equal(await db.transactions.get(txId), undefined);

  const same = await q.addPreset({ name: 'transport', categoryId: transport.id, amount: 3000 });
  assert.equal((await db.transactions.get(await q.logPreset(same, NOW))).note, '');
  await assert.rejects(q.addPreset({ name: 'Bad', categoryId: transport.id, amount: 0 }), /positive whole number/);
});

test('movePreset reorders presets', async () => {
  const transport = await cat('Transport');
  const a = await q.addPreset({ name: 'A', categoryId: transport.id, amount: 1 });
  const b = await q.addPreset({ name: 'B', categoryId: transport.id, amount: 2 });
  await q.movePreset(b, -1);
  assert.deepEqual((await q.listPresets()).map((p) => p.id), [b, a]);
});

test('updateSettings validates values', async () => {
  await assert.rejects(q.updateSettings({ monthStartDay: 0 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthStartDay: 32 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthStartDay: 1.5 }), /1–31/);
  await assert.rejects(q.updateSettings({ monthlyBudget: 0 }), /positive whole number/);
  await q.updateSettings({ monthlyBudget: null, openingBalance: -50000, monthStartDay: 10 });
  const s = await q.getSettings();
  assert.equal(s.openingBalance, -50000);
  assert.equal(s.monthStartDay, 10);
  assert.equal(s.monthlyBudget, null);
});

test('restoreBackup round-trips and leaves data untouched on bad files', async () => {
  await addExpense(45000, 'Food', '2026-10-03', 'lunch');
  await q.updateSettings({ openingBalance: 250000 });
  const backup = await createBackup(NOW);
  const json = JSON.stringify(backup);

  const bad = structuredClone(backup);
  bad.transactions[0].amount = -1;
  await assert.rejects(restoreBackup('not json'), /not valid JSON/);
  await assert.rejects(restoreBackup(JSON.stringify({ ...backup, app: 'workout-tracker' })), /not an Expense Tracker backup/);
  await assert.rejects(restoreBackup(JSON.stringify({ ...backup, schemaVersion: 99 })), /newer version/);
  await assert.rejects(restoreBackup(JSON.stringify(bad)), /transactions\[0\]/);
  assert.equal((await q.allTransactions()).length, 1);

  await addExpense(1000);
  await q.updateSettings({ openingBalance: 0 });
  const result = await restoreBackup(json);
  assert.equal(result.transactions, 1);
  assert.deepEqual(await q.allTransactions(), backup.transactions);
  assert.deepEqual(await db.categories.toArray(), backup.categories);
  assert.equal((await q.getSettings()).openingBalance, 250000);
});
