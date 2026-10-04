import { formatSom } from './money.ts';

export type BudgetLevel = 'ok' | 'warning' | 'over';

/** From this share of the budget on, the bar turns amber and a toast warns. */
export const WARNING_RATIO = 0.8;

export interface BudgetStatus {
  level: BudgetLevel;
  /** spent / limit */
  ratio: number;
  /** limit − spent; negative when over. */
  remaining: number;
}

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0;
  const level: BudgetLevel = ratio > 1 ? 'over' : ratio >= WARNING_RATIO ? 'warning' : 'ok';
  return { level, ratio, remaining: limit - spent };
}

const RANK: Record<BudgetLevel, number> = { ok: 0, warning: 1, over: 2 };

/** The new status if spending moved from `before` to `after` raised the level; otherwise null. */
export function budgetCrossing(before: number, after: number, limit: number | null): BudgetStatus | null {
  if (limit === null || limit <= 0) return null;
  const from = budgetStatus(before, limit);
  const to = budgetStatus(after, limit);
  return RANK[to.level] > RANK[from.level] ? to : null;
}

export function budgetMessage(s: BudgetStatus): string {
  if (s.level === 'over') return `Over this month's budget by ${formatSom(-s.remaining)}`;
  return `${Math.round(s.ratio * 100)}% of this month's budget used`;
}
