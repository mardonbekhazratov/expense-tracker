import type { Kind, Transaction } from '../db/types.ts';

export interface TxFilter {
  kind: Kind | 'all';
  categoryId: number | null;
  /** Matches note text or category name, case-insensitive. */
  query: string;
}

export const EMPTY_FILTER: TxFilter = { kind: 'all', categoryId: null, query: '' };

export function filterTransactions<T extends Transaction>(
  txs: readonly T[],
  f: TxFilter,
  categoryName: (id: number) => string,
): T[] {
  const q = f.query.trim().toLocaleLowerCase();
  return txs.filter(
    (t) =>
      (f.kind === 'all' || t.kind === f.kind) &&
      (f.categoryId === null || t.categoryId === f.categoryId) &&
      (q === '' ||
        t.note.toLocaleLowerCase().includes(q) ||
        categoryName(t.categoryId).toLocaleLowerCase().includes(q)),
  );
}

export interface DayGroup<T> {
  date: string;
  items: T[];
  /** Income minus spending for the entries in this group. */
  net: number;
}

/** Newest day first; newest entry first within a day. */
export function groupByDay<T extends Transaction>(txs: readonly T[]): DayGroup<T>[] {
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const groups: DayGroup<T>[] = [];
  for (const t of sorted) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== t.date) {
      g = { date: t.date, items: [], net: 0 };
      groups.push(g);
    }
    g.items.push(t);
    g.net += t.kind === 'income' ? t.amount : -t.amount;
  }
  return groups;
}
