import type { Category, Transaction } from '../db/types';
import type { DayGroup } from '../lib/filter';
import { formatDayHeading } from '../lib/dates';
import { formatNet } from '../lib/money';
import { useToday } from '../hooks/useToday';
import { TransactionRow } from './TransactionRow';

interface Props {
  groups: DayGroup<Transaction>[];
  categories: Map<number, Category>;
  /** Show each day's net total (only meaningful when the groups hold whole days). */
  showNet?: boolean;
}

export function DayGroupList({ groups, categories, showNet = false }: Props) {
  const today = useToday();
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.date}>
          <div className="flex items-baseline justify-between px-1 mb-1.5">
            <h3 className="text-xs font-semibold text-ink-300">{formatDayHeading(g.date, today)}</h3>
            {showNet && (
              <span className={`text-xs font-semibold num ${g.net > 0 ? 'text-emerald-300' : 'text-ink-400'}`}>
                {formatNet(g.net)}
              </span>
            )}
          </div>
          <ul className="card divide-y divide-ink-800/80 overflow-hidden">
            {g.items.map((t) => (
              <TransactionRow key={t.id} tx={t} category={categories.get(t.categoryId)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
