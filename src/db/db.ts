import Dexie, { type EntityTable } from 'dexie';
import type { Category, Preset, Settings, Transaction } from './types.ts';

export const DB_NAME = 'expenseTrackerDB';

// Never edit a released version. To add or change an index, add
// db.version(2).stores({...}).upgrade(...) below. Adding non-indexed fields
// needs no new version.
export const db = new Dexie(DB_NAME) as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  categories: EntityTable<Category, 'id'>;
  presets: EntityTable<Preset, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  transactions: '++id, date, categoryId, [date+createdAt]',
  categories: '++id, kind',
  presets: '++id, categoryId',
  settings: 'id',
});
