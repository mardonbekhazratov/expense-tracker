import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { Select } from '../components/ui/Select';
import { CategoryBars } from '../components/charts/CategoryBars';
import { DailySpendingChart } from '../components/charts/DailySpendingChart';
import { IncomeVsSpendingChart } from '../components/charts/IncomeVsSpendingChart';
import { CategoryTrendChart } from '../components/charts/CategoryTrendChart';
import { INCOME_COLOR, SPEND_COLOR } from '../components/charts/chartTheme';
import { transactionsBetween } from '../db/queries';
import type { Transaction } from '../db/types';
import { useCategoryMap, useSelectedPeriod, useSettings } from '../hooks/useData';
import { useToday } from '../hooks/useToday';
import { periodLabel, periodShortLabel, periodsEndingWith } from '../lib/period';
import {
  categoryPerPeriod,
  dailyAverage,
  inPeriod,
  spendingPerDay,
  totals,
  totalsByCategory,
  totalsPerPeriod,
} from '../lib/stats';
import { formatSom } from '../lib/money';

const NONE: Transaction[] = [];

export function StatsScreen() {
  const { period } = useSelectedPeriod();
  const { monthStartDay } = useSettings();
  const categories = useCategoryMap();
  const today = useToday();
  const trendRef = useRef<HTMLDivElement>(null);
  const [trendPick, setTrendPick] = useState<number | null>(null);

  const periods = useMemo(() => periodsEndingWith(period, 12, monthStartDay), [period, monthStartDay]);
  const from = periods[0].start;
  const txs = useLiveQuery(() => transactionsBetween(from, period.end), [from, period.end], NONE);

  const current = inPeriod(txs, period);
  const byCategory = totalsByCategory(current, 'expense');
  const days = spendingPerDay(current, period);
  const average = dailyAverage(days, today);
  const perPeriod = totalsPerPeriod(txs, periods).map((row, i) => ({
    ...row,
    label: periodShortLabel(periods[i]),
    title: periodLabel(periods[i]),
  }));

  const trendId = trendPick ?? byCategory[0]?.categoryId ?? null;
  const trendCategory = trendId === null ? undefined : categories.get(trendId);
  const trend =
    trendId === null
      ? []
      : categoryPerPeriod(txs, trendId, periods).map((row, i) => ({
          ...row,
          label: periodShortLabel(periods[i]),
          title: periodLabel(periods[i]),
        }));

  const trendOptions = [...categories.values()]
    .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1))
    .map((c) => ({ value: String(c.id), label: c.name, hint: c.kind === 'income' ? 'Income' : 'Expense' }));

  return (
    <div>
      <ScreenHeader eyebrow="Where it goes" title="Stats" />
      <div className="px-4 space-y-3">
        <PeriodSwitcher />

        <Card title="Spending by category" subtitle={formatSom(totals(current).spent)}>
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <CategoryBars
              rows={byCategory}
              categories={categories}
              onPick={(id) => {
                setTrendPick(id);
                trendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          )}
        </Card>

        <Card title="Spending per day" subtitle={`Average ${formatSom(average)} a day`}>
          <DailySpendingChart days={days} average={average} today={today} />
        </Card>

        <Card title="Income vs spending" subtitle="12 months">
          <IncomeVsSpendingChart data={perPeriod} />
        </Card>

        <div ref={trendRef} className="scroll-mt-4">
          <Card title="Category over time" subtitle="12 months">
            <Select
              eyebrow="Category"
              sheetTitle="Category"
              placeholder="Choose a category"
              value={trendId === null ? '' : String(trendId)}
              options={trendOptions}
              onChange={(v) => setTrendPick(Number(v))}
            />
            {trendCategory && (
              <div className="mt-3">
                <CategoryTrendChart
                  data={trend}
                  name={trendCategory.name}
                  color={trendCategory.kind === 'income' ? INCOME_COLOR : SPEND_COLOR}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-semibold text-ink-50">{title}</h2>
        {subtitle && <p className="text-xs text-ink-400 num">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-ink-400 py-4 text-center">No spending this month yet.</p>;
}
