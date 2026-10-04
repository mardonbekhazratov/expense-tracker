import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { DayGroupList } from '../components/DayGroupList';
import { Icon } from '../components/Icon';
import { Select } from '../components/ui/Select';
import { transactionsBetween } from '../db/queries';
import type { Kind, Transaction } from '../db/types';
import { useCategoryMap, useSelectedPeriod } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { filterTransactions, groupByDay } from '../lib/filter';
import { totals } from '../lib/stats';
import { groupDigits } from '../lib/money';

const KINDS: { value: Kind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

const NONE: Transaction[] = [];

export function HistoryScreen() {
  const { period } = useSelectedPeriod();
  const categories = useCategoryMap();
  const filter = useStore((s) => s.historyFilter);
  const setFilter = useStore((s) => s.setHistoryFilter);
  const txs = useLiveQuery(() => transactionsBetween(period.start, period.end), [period.start, period.end], NONE);

  const shown = filterTransactions(txs, filter, (id) => categories.get(id)?.name ?? '');
  const sum = totals(shown);

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...[...categories.values()]
      .filter((c) => filter.kind === 'all' || c.kind === filter.kind)
      .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1))
      .map((c) => ({
        value: String(c.id),
        label: c.name,
        hint: `${c.kind === 'income' ? 'Income' : 'Expense'}${c.archived ? ' · hidden' : ''}`,
      })),
  ];

  function setKind(kind: Kind | 'all') {
    const selected = filter.categoryId === null ? undefined : categories.get(filter.categoryId);
    const keepCategory = kind === 'all' || !selected || selected.kind === kind;
    setFilter({ kind, categoryId: keepCategory ? filter.categoryId : null });
  }

  return (
    <div>
      <ScreenHeader eyebrow="Entries" title="History" />
      <div className="px-4 space-y-3">
        <PeriodSwitcher />
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-800/60 p-1 border border-ink-700/50">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={filter.kind === k.value}
              onClick={() => setKind(k.value)}
              className={`tap rounded-xl text-sm font-bold ${filter.kind === k.value ? 'bg-ink-50 text-ink-950' : 'text-ink-300'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <Select
          eyebrow="Category"
          sheetTitle="Category"
          value={filter.categoryId === null ? 'all' : String(filter.categoryId)}
          options={categoryOptions}
          onChange={(v) => setFilter({ categoryId: v === 'all' ? null : Number(v) })}
        />
        <label className="relative block">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
            placeholder="Search notes and categories"
            enterKeyHint="search"
            className="field-flat pl-10"
          />
        </label>
        <p className="text-xs text-ink-400 px-1 num">
          {shown.length} {shown.length === 1 ? 'entry' : 'entries'} · in +{groupDigits(sum.income)} · out −{groupDigits(sum.spent)}
        </p>
        {shown.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-400">Nothing here for this month and filter.</div>
        ) : (
          <DayGroupList groups={groupByDay(shown)} categories={categories} showNet />
        )}
      </div>
    </div>
  );
}
