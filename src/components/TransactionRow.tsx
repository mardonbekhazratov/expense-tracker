import type { Category, Transaction } from '../db/types';
import { useStore } from '../store/useStore';
import { formatSigned } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';
import { CategoryBadge } from './CategoryBadge';

export function TransactionRow({ tx, category }: { tx: Transaction; category?: Category }) {
  const openEdit = useStore((s) => s.openEdit);
  const c = category ?? UNKNOWN_CATEGORY;
  return (
    <li>
      <button
        type="button"
        onClick={() => openEdit(tx)}
        className="tap w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-ink-800/50"
      >
        <CategoryBadge category={c} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-50">{c.name}</span>
          {tx.note && <span className="block truncate text-xs text-ink-400">{tx.note}</span>}
        </span>
        <span className={`shrink-0 font-semibold num ${tx.kind === 'income' ? 'text-emerald-300' : 'text-ink-100'}`}>
          {formatSigned(tx.amount, tx.kind)}
        </span>
      </button>
    </li>
  );
}
