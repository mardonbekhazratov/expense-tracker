import type { Category } from '../../db/types';
import type { CategoryTotal } from '../../lib/stats';
import { groupDigits } from '../../lib/money';
import { UNKNOWN_CATEGORY } from '../../lib/categoryStyle';
import { CategoryBadge } from '../CategoryBadge';
import { SPEND_COLOR } from './chartTheme';

interface Props {
  rows: CategoryTotal[];
  categories: Map<number, Category>;
  onPick: (categoryId: number) => void;
}

export function CategoryBars({ rows, categories, onPick }: Props) {
  const max = rows[0]?.amount ?? 0;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const c = categories.get(r.categoryId) ?? UNKNOWN_CATEGORY;
        return (
          <li key={r.categoryId}>
            <button type="button" onClick={() => onPick(r.categoryId)} className="tap w-full text-left">
              <span className="flex items-center gap-2.5">
                <CategoryBadge category={c} size={28} />
                <span className="flex-1 min-w-0 truncate text-sm font-semibold text-ink-100">{c.name}</span>
                <span className="text-sm font-semibold text-ink-50 num">{groupDigits(r.amount)}</span>
                <span className="w-10 text-right text-xs text-ink-400 num">{Math.round(r.share * 100)}%</span>
              </span>
              <span className="block mt-1.5 ml-[38px] h-2 rounded-[4px] bg-ink-800">
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{ width: `${max ? (r.amount / max) * 100 : 0}%`, background: SPEND_COLOR }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
