import { db } from './db.ts';
import { DEFAULT_SETTINGS } from './seed.ts';
import type { Category, CategoryColor, CategoryIcon, Kind, Preset, Settings, Transaction } from './types.ts';
import { MAX_DIGITS } from '../lib/money.ts';
import { toISODate } from '../lib/dates.ts';
import { periodContaining } from '../lib/period.ts';
import { totals, type Totals } from '../lib/stats.ts';
import { budgetCrossing, type BudgetStatus } from '../lib/budget.ts';

// Every write the UI makes goes through this module, so the data rules from
// the spec (whole som, matching kinds, no future dates, unique names, no
// deleting used categories) hold no matter which screen calls them.

function assertAmount(amount: number, label = 'Amount'): void {
  if (!Number.isInteger(amount) || amount <= 0 || String(amount).length > MAX_DIGITS) {
    throw new Error(`${label} must be a positive whole number`);
  }
}

async function getCategory(id: number): Promise<Category> {
  const c = await db.categories.get(id);
  if (!c) throw new Error('Category not found');
  return c;
}

function byOrder(a: { sortOrder: number; id?: number }, b: { sortOrder: number; id?: number }): number {
  return a.sortOrder - b.sortOrder || (a.id ?? 0) - (b.id ?? 0);
}

/** Swaps an item with its neighbour, then renumbers the list 0..n-1. */
async function reorder<T extends { id?: number; sortOrder: number }>(
  sorted: T[],
  id: number,
  direction: -1 | 1,
  save: (id: number, sortOrder: number) => Promise<unknown>,
): Promise<void> {
  const i = sorted.findIndex((x) => x.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  const next = [...sorted];
  [next[i], next[j]] = [next[j], next[i]];
  await Promise.all(next.map((x, idx) => (x.sortOrder === idx ? null : save(x.id!, idx))));
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------- entries

export type TransactionInput = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date' | 'note'>;

async function checkTransactionInput(input: TransactionInput, now: Date): Promise<void> {
  assertAmount(input.amount);
  const category = await getCategory(input.categoryId);
  if (category.kind !== input.kind) throw new Error('Category does not match the entry type');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid date');
  if (input.date > toISODate(now)) throw new Error('Entries cannot be in the future');
}

export async function addTransaction(input: TransactionInput, now = new Date()): Promise<number> {
  await checkTransactionInput(input, now);
  const t = now.getTime();
  // ++id always assigns a key; Dexie types it as optional because `id` is.
  const id = await db.transactions.add({
    kind: input.kind,
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    note: input.note.trim(),
    createdAt: t,
    updatedAt: t,
  });
  return id!;
}

export async function updateTransaction(id: number, input: TransactionInput, now = new Date()): Promise<void> {
  await checkTransactionInput(input, now);
  const changed = await db.transactions.update(id, {
    kind: input.kind,
    amount: input.amount,
    categoryId: input.categoryId,
    date: input.date,
    note: input.note.trim(),
    updatedAt: now.getTime(),
  });
  if (changed === 0) throw new Error('Entry not found');
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id);
}

export function transactionsBetween(start: string, end: string): Promise<Transaction[]> {
  return db.transactions.where('date').between(start, end, true, true).toArray();
}

/** Newest first: by date, then by when the entry was created. */
export function recentTransactions(limit: number): Promise<Transaction[]> {
  return db.transactions.orderBy('[date+createdAt]').reverse().limit(limit).toArray();
}

export function allTransactions(): Promise<Transaction[]> {
  return db.transactions.toArray();
}

export async function periodTotals(start: string, end: string): Promise<Totals> {
  return totals(await transactionsBetween(start, end));
}

/**
 * Runs a write and reports whether it pushed this month's spending to a higher
 * budget level (ok → warning → over). Comparing real before/after totals
 * covers adds, edits (amount, date or type) and deletes the same way.
 */
export async function withBudgetCheck(action: () => Promise<unknown>, now = new Date()): Promise<BudgetStatus | null> {
  const settings = await getSettings();
  const p = periodContaining(toISODate(now), settings.monthStartDay);
  const before = (await periodTotals(p.start, p.end)).spent;
  await action();
  const after = (await periodTotals(p.start, p.end)).spent;
  return budgetCrossing(before, after, settings.monthlyBudget);
}

// ------------------------------------------------------------- categories

export interface CategoryInput {
  name: string;
  kind: Kind;
  icon: CategoryIcon;
  color: CategoryColor;
}

/** Categories of one kind (or all kinds) in display order; hidden ones only on request. */
export async function listCategories(kind?: Kind, opts: { includeArchived?: boolean } = {}): Promise<Category[]> {
  const rows = kind ? await db.categories.where('kind').equals(kind).toArray() : await db.categories.toArray();
  return rows.filter((c) => opts.includeArchived || !c.archived).sort(byOrder);
}

async function assertNameFree(kind: Kind, name: string, exceptId?: number): Promise<void> {
  const key = name.toLocaleLowerCase();
  const clash = (await db.categories.where('kind').equals(kind).toArray()).find(
    (c) => c.id !== exceptId && c.name.toLocaleLowerCase() === key,
  );
  if (!clash) return;
  throw new Error(
    clash.archived
      ? `"${clash.name}" already exists but is hidden. Unhide it in Settings → Categories.`
      : `"${clash.name}" already exists`,
  );
}

export async function addCategory(input: CategoryInput): Promise<number> {
  const name = cleanName(input.name);
  if (!name) throw new Error('Name is required');
  return db.transaction('rw', db.categories, async () => {
    await assertNameFree(input.kind, name);
    const siblings = await db.categories.where('kind').equals(input.kind).toArray();
    const sortOrder = siblings.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
    const id = await db.categories.add({ name, kind: input.kind, icon: input.icon, color: input.color, sortOrder, archived: false });
    return id!;
  });
}

export async function updateCategory(
  id: number,
  patch: { name: string; icon: CategoryIcon; color: CategoryColor },
): Promise<void> {
  const name = cleanName(patch.name);
  if (!name) throw new Error('Name is required');
  await db.transaction('rw', db.categories, async () => {
    const current = await getCategory(id);
    await assertNameFree(current.kind, name, id);
    await db.categories.update(id, { name, icon: patch.icon, color: patch.color });
  });
}

export async function setCategoryArchived(id: number, archived: boolean): Promise<void> {
  await db.categories.update(id, { archived });
}

export async function categoryUsage(id: number): Promise<{ transactions: number; presets: number }> {
  const [transactions, presets] = await Promise.all([
    db.transactions.where('categoryId').equals(id).count(),
    db.presets.where('categoryId').equals(id).count(),
  ]);
  return { transactions, presets };
}

/** Deletes a never-used category. Used ones can only be hidden. */
export async function deleteCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, db.transactions, db.presets, async () => {
    const usage = await categoryUsage(id);
    if (usage.transactions > 0 || usage.presets > 0) throw new Error('This category is in use. Hide it instead.');
    await db.categories.delete(id);
  });
}

export async function moveCategory(id: number, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const c = await getCategory(id);
    const siblings = (await db.categories.where('kind').equals(c.kind).toArray()).sort(byOrder);
    await reorder(siblings, id, direction, (rowId, sortOrder) => db.categories.update(rowId, { sortOrder }));
  });
}

// ---------------------------------------------------------------- presets

export interface PresetInput {
  name: string;
  categoryId: number;
  amount: number;
}

export async function listPresets(): Promise<Preset[]> {
  return (await db.presets.toArray()).sort(byOrder);
}

async function checkPresetInput(input: PresetInput): Promise<string> {
  const name = cleanName(input.name);
  if (!name) throw new Error('Name is required');
  assertAmount(input.amount);
  await getCategory(input.categoryId);
  return name;
}

export async function addPreset(input: PresetInput): Promise<number> {
  const name = await checkPresetInput(input);
  const all = await db.presets.toArray();
  const sortOrder = all.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
  const id = await db.presets.add({ name, categoryId: input.categoryId, amount: input.amount, sortOrder });
  return id!;
}

export async function updatePreset(id: number, input: PresetInput): Promise<void> {
  const name = await checkPresetInput(input);
  await db.presets.update(id, { name, categoryId: input.categoryId, amount: input.amount });
}

export async function deletePreset(id: number): Promise<void> {
  await db.presets.delete(id);
}

export async function movePreset(id: number, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.presets, async () => {
    const all = (await db.presets.toArray()).sort(byOrder);
    await reorder(all, id, direction, (rowId, sortOrder) => db.presets.update(rowId, { sortOrder }));
  });
}

/**
 * Logs a preset as today's entry and returns the new entry's id (for Undo).
 * The note is the preset name unless it just repeats the category name.
 */
export async function logPreset(presetId: number, now = new Date()): Promise<number> {
  const preset = await db.presets.get(presetId);
  if (!preset) throw new Error('Preset not found');
  const category = await getCategory(preset.categoryId);
  const note = preset.name.toLocaleLowerCase() === category.name.toLocaleLowerCase() ? '' : preset.name;
  return addTransaction(
    { kind: category.kind, amount: preset.amount, categoryId: preset.categoryId, date: toISODate(now), note },
    now,
  );
}

// --------------------------------------------------------------- settings

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get(1)) ?? { ...DEFAULT_SETTINGS };
}

export type SettingsPatch = Partial<Omit<Settings, 'id'>>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  const day = patch.monthStartDay;
  if (day !== undefined && !(Number.isInteger(day) && day >= 1 && day <= 31)) {
    throw new Error('Month start day must be 1–31');
  }
  const opening = patch.openingBalance;
  if (opening !== undefined && !(Number.isInteger(opening) && String(Math.abs(opening)).length <= MAX_DIGITS)) {
    throw new Error('Starting balance must be a whole number');
  }
  if (patch.monthlyBudget !== undefined && patch.monthlyBudget !== null) assertAmount(patch.monthlyBudget, 'Budget');
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ ...(await getSettings()), ...patch, id: 1 });
  });
}
