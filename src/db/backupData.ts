import { db } from './db.ts';
import { getSettings } from './queries.ts';
import { BACKUP_APP, BACKUP_SCHEMA_VERSION, validateBackup, type BackupFile } from '../lib/backupFormat.ts';
import { buildCsv } from '../lib/csv.ts';

const ALL_TABLES = () => [db.settings, db.categories, db.presets, db.transactions];

export async function createBackup(now = new Date()): Promise<BackupFile> {
  return db.transaction('r', ALL_TABLES(), async () => ({
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: await getSettings(),
    categories: await db.categories.toArray(),
    presets: await db.presets.toArray(),
    transactions: await db.transactions.toArray(),
  }));
}

/**
 * Replaces all data with a backup file's contents. The file is fully
 * validated first; if anything is wrong it throws and nothing changes.
 */
export async function restoreBackup(text: string): Promise<{ transactions: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON');
  }
  const check = validateBackup(parsed);
  if (!check.ok) throw new Error(check.error);
  const b = check.backup;
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
    await db.settings.put(b.settings);
    await db.categories.bulkAdd(b.categories);
    await db.presets.bulkAdd(b.presets);
    await db.transactions.bulkAdd(b.transactions);
  });
  return { transactions: b.transactions.length };
}

export async function createCsv(): Promise<string> {
  const [txs, categories] = await Promise.all([db.transactions.toArray(), db.categories.toArray()]);
  const names = new Map(categories.map((c) => [c.id!, c.name]));
  return buildCsv(txs, (id) => names.get(id) ?? 'Unknown');
}
