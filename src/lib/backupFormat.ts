import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Category,
  type CategoryColor,
  type CategoryIcon,
  type Kind,
  type Preset,
  type Settings,
  type Transaction,
} from '../db/types.ts';

export const BACKUP_APP = 'expense-tracker';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  categories: Category[];
  presets: Preset[];
  transactions: Transaction[];
}

export type BackupCheck = { ok: true; backup: BackupFile } | { ok: false; error: string };

const MAX_AMOUNT = 999_999_999_999;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const isAmount = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_AMOUNT;
const isKind = (v: unknown): v is Kind => v === 'expense' || v === 'income';
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function fail(message: string): never {
  throw new Error(message);
}

/**
 * Checks an imported backup completely before anything is written, so a bad
 * file can never leave the database half-replaced. Unknown fields are dropped.
 */
export function validateBackup(input: unknown): BackupCheck {
  try {
    return { ok: true, backup: check(input) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function check(input: unknown): BackupFile {
  if (!isObj(input) || input.app !== BACKUP_APP) fail('This is not an Expense Tracker backup');
  const version = input.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) fail('The backup has no valid schema version');
  if ((version as number) > BACKUP_SCHEMA_VERSION) fail('This backup comes from a newer version of the app');
  if (typeof input.exportedAt !== 'string') fail('exportedAt is missing');

  const settings = checkSettings(input.settings);
  const categories = list(input.categories, 'categories').map(checkCategory);
  uniqueIds(categories, 'categories');
  const kindOf = new Map(categories.map((c) => [c.id!, c.kind]));
  const presets = list(input.presets, 'presets').map((p, i) => checkPreset(p, i, kindOf));
  uniqueIds(presets, 'presets');
  const transactions = list(input.transactions, 'transactions').map((t, i) => checkTransaction(t, i, kindOf));
  uniqueIds(transactions, 'transactions');

  return {
    app: BACKUP_APP,
    schemaVersion: version as number,
    exportedAt: input.exportedAt,
    settings,
    categories,
    presets,
    transactions,
  };
}

function list(v: unknown, name: string): unknown[] {
  if (!Array.isArray(v)) fail(`${name} is missing`);
  return v;
}

function uniqueIds(items: { id?: number }[], name: string): void {
  const seen = new Set<number>();
  for (const it of items) {
    if (seen.has(it.id!)) fail(`${name}: duplicate id ${it.id}`);
    seen.add(it.id!);
  }
}

function checkSettings(v: unknown): Settings {
  const at = 'settings';
  if (!isObj(v)) fail(`${at} is missing`);
  if (!Number.isInteger(v.openingBalance) || Math.abs(v.openingBalance as number) > MAX_AMOUNT) {
    fail(`${at}: starting balance must be a whole number`);
  }
  const day = v.monthStartDay;
  if (!Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) fail(`${at}: month start day must be 1–31`);
  if (v.monthlyBudget !== null && !isAmount(v.monthlyBudget)) fail(`${at}: monthly budget must be empty or a positive whole number`);
  if (typeof v.lockEnabled !== 'boolean') fail(`${at}: lockEnabled must be true or false`);
  if (typeof v.balancePromptDismissed !== 'boolean') fail(`${at}: balancePromptDismissed must be true or false`);
  return {
    id: 1,
    openingBalance: v.openingBalance as number,
    monthStartDay: day as number,
    monthlyBudget: v.monthlyBudget as number | null,
    lockEnabled: v.lockEnabled,
    balancePromptDismissed: v.balancePromptDismissed,
  };
}

function checkCategory(v: unknown, i: number): Category {
  const at = `categories[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isText(v.name)) fail(`${at}: name is missing`);
  if (!isKind(v.kind)) fail(`${at}: kind must be expense or income`);
  if (!(CATEGORY_ICONS as readonly unknown[]).includes(v.icon)) fail(`${at}: unknown icon`);
  if (!(CATEGORY_COLORS as readonly unknown[]).includes(v.color)) fail(`${at}: unknown color`);
  if (!Number.isInteger(v.sortOrder)) fail(`${at}: invalid sortOrder`);
  if (typeof v.archived !== 'boolean') fail(`${at}: archived must be true or false`);
  return {
    id: v.id,
    name: v.name,
    kind: v.kind,
    icon: v.icon as CategoryIcon,
    color: v.color as CategoryColor,
    sortOrder: v.sortOrder as number,
    archived: v.archived,
  };
}

function checkPreset(v: unknown, i: number, kindOf: Map<number, Kind>): Preset {
  const at = `presets[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isText(v.name)) fail(`${at}: name is missing`);
  if (!isId(v.categoryId) || !kindOf.has(v.categoryId)) fail(`${at}: unknown category`);
  if (!isAmount(v.amount)) fail(`${at}: amount must be a positive whole number`);
  if (!Number.isInteger(v.sortOrder)) fail(`${at}: invalid sortOrder`);
  return { id: v.id, name: v.name, categoryId: v.categoryId, amount: v.amount, sortOrder: v.sortOrder as number };
}

function checkTransaction(v: unknown, i: number, kindOf: Map<number, Kind>): Transaction {
  const at = `transactions[${i}]`;
  if (!isObj(v)) fail(`${at}: not an object`);
  if (!isId(v.id)) fail(`${at}: invalid id`);
  if (!isKind(v.kind)) fail(`${at}: kind must be expense or income`);
  if (!isAmount(v.amount)) fail(`${at}: amount must be a positive whole number`);
  if (!isId(v.categoryId) || !kindOf.has(v.categoryId)) fail(`${at}: unknown category`);
  if (kindOf.get(v.categoryId) !== v.kind) fail(`${at}: kind does not match its category`);
  if (typeof v.date !== 'string' || !DATE_RE.test(v.date)) fail(`${at}: date must be YYYY-MM-DD`);
  if (typeof v.note !== 'string') fail(`${at}: note must be text`);
  if (!Number.isFinite(v.createdAt) || !Number.isFinite(v.updatedAt)) fail(`${at}: invalid timestamps`);
  return {
    id: v.id,
    kind: v.kind,
    amount: v.amount,
    categoryId: v.categoryId,
    date: v.date,
    note: v.note,
    createdAt: v.createdAt as number,
    updatedAt: v.updatedAt as number,
  };
}
