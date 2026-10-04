import type { Kind } from '../db/types.ts';

export type DeepLinkAction = { type: 'add'; kind: Kind };

/** Understands expensetracker://add?kind=expense|income (sent by the home-screen widget). */
export function parseDeepLink(url: string): DeepLinkAction | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'expensetracker:' || u.host !== 'add') return null;
  return { type: 'add', kind: u.searchParams.get('kind') === 'income' ? 'income' : 'expense' };
}
