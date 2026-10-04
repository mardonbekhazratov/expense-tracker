import type { Kind, Transaction } from '../db/types.ts';
import type { Period } from './period.ts';
import { addDaysISO } from './dates.ts';

/** The fields aggregation needs; real rows carry more. */
export type TxLike = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'date'>;

export interface Totals {
  income: number;
  spent: number;
  /** income − spent */
  net: number;
}

export function totals(txs: readonly TxLike[]): Totals {
  let income = 0;
  let spent = 0;
  for (const t of txs) {
    if (t.kind === 'income') income += t.amount;
    else spent += t.amount;
  }
  return { income, spent, net: income - spent };
}

/** Money on hand: the starting balance plus all income minus all expenses. */
export function balance(openingBalance: number, txs: readonly TxLike[]): number {
  return openingBalance + totals(txs).net;
}

export function inPeriod<T extends TxLike>(txs: readonly T[], p: Period): T[] {
  return txs.filter((t) => t.date >= p.start && t.date <= p.end);
}

export interface CategoryTotal {
  categoryId: number;
  amount: number;
  /** Fraction (0–1) of all entries of this kind. */
  share: number;
}

/** Per-category sums for one kind, largest first (ties by category id). */
export function totalsByCategory(txs: readonly TxLike[], kind: Kind): CategoryTotal[] {
  const sums = new Map<number, number>();
  let all = 0;
  for (const t of txs) {
    if (t.kind !== kind) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    all += t.amount;
  }
  return [...sums]
    .map(([categoryId, amount]) => ({ categoryId, amount, share: all > 0 ? amount / all : 0 }))
    .sort((a, b) => b.amount - a.amount || a.categoryId - b.categoryId);
}

export interface DayTotal {
  date: string;
  spent: number;
}

/** Spending on every day of the period, including days with nothing spent. */
export function spendingPerDay(txs: readonly TxLike[], p: Period): DayTotal[] {
  const byDate = new Map<string, number>();
  for (const t of txs) {
    if (t.kind === 'expense' && t.date >= p.start && t.date <= p.end) {
      byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.amount);
    }
  }
  const days: DayTotal[] = [];
  for (let d = p.start; d <= p.end; d = addDaysISO(d, 1)) {
    days.push({ date: d, spent: byDate.get(d) ?? 0 });
  }
  return days;
}

/** Average spending per day over the days up to and including `today`. */
export function dailyAverage(days: readonly DayTotal[], today: string): number {
  const elapsed = days.filter((d) => d.date <= today);
  if (elapsed.length === 0) return 0;
  return Math.round(elapsed.reduce((sum, d) => sum + d.spent, 0) / elapsed.length);
}

export interface PeriodTotals extends Totals {
  key: string;
}

export function totalsPerPeriod(txs: readonly TxLike[], periods: readonly Period[]): PeriodTotals[] {
  return periods.map((p) => ({ key: p.key, ...totals(inPeriod(txs, p)) }));
}

export interface PeriodAmount {
  key: string;
  amount: number;
}

export function categoryPerPeriod(
  txs: readonly TxLike[],
  categoryId: number,
  periods: readonly Period[],
): PeriodAmount[] {
  return periods.map((p) => ({
    key: p.key,
    amount: inPeriod(txs, p)
      .filter((t) => t.categoryId === categoryId)
      .reduce((sum, t) => sum + t.amount, 0),
  }));
}
