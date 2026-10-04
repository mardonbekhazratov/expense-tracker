import { db } from './db.ts';
import type { Category, Settings } from './types.ts';

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  openingBalance: 0,
  monthStartDay: 1,
  monthlyBudget: null,
  lockEnabled: false,
  balancePromptDismissed: false,
};

export const DEFAULT_CATEGORIES: Pick<Category, 'name' | 'kind' | 'icon' | 'color'>[] = [
  { name: 'Food', kind: 'expense', icon: 'food', color: 'ember' },
  { name: 'Transport', kind: 'expense', icon: 'transport', color: 'sky' },
  { name: 'Phone/Internet', kind: 'expense', icon: 'phone', color: 'violet' },
  { name: 'Groceries', kind: 'expense', icon: 'cart', color: 'lime' },
  { name: 'Health', kind: 'expense', icon: 'health', color: 'rose' },
  { name: 'Shopping', kind: 'expense', icon: 'bag', color: 'pink' },
  { name: 'Bills', kind: 'expense', icon: 'bolt', color: 'amber' },
  { name: 'Other', kind: 'expense', icon: 'dots', color: 'slate' },
  { name: 'Salary', kind: 'income', icon: 'wallet', color: 'emerald' },
  { name: 'Competitions', kind: 'income', icon: 'trophy', color: 'amber' },
  { name: 'Gift', kind: 'income', icon: 'gift', color: 'pink' },
  { name: 'Other', kind: 'income', icon: 'dots', color: 'slate' },
];

/**
 * First launch only: creates the settings row and the default categories.
 * Runs on every boot, so it must stay idempotent. Categories are seeded only
 * together with the settings row, so deleted defaults never come back.
 */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.settings, db.categories, async () => {
    if (await db.settings.get(1)) return;
    await db.settings.add({ ...DEFAULT_SETTINGS });
    if ((await db.categories.count()) === 0) {
      const counters = { expense: 0, income: 0 };
      await db.categories.bulkAdd(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, sortOrder: counters[c.kind]++, archived: false })),
      );
    }
  });
}
