import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { BalanceCard } from '../components/BalanceCard';
import { BudgetBar } from '../components/BudgetBar';
import { PresetBar } from '../components/PresetBar';
import { DayGroupList } from '../components/DayGroupList';
import { Icon } from '../components/Icon';
import { allTransactions, recentTransactions, transactionsBetween, updateSettings } from '../db/queries';
import type { Transaction } from '../db/types';
import { useCategoryMap, useCurrentPeriod, useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { balance, totals } from '../lib/stats';
import { groupByDay } from '../lib/filter';
import { periodLabel, periodRangeLabel } from '../lib/period';

const NONE: Transaction[] = [];

export function HomeScreen() {
  const settings = useSettings();
  const period = useCurrentPeriod();
  const categories = useCategoryMap();
  const openAdd = useStore((s) => s.openAdd);
  const navigate = useNavigate();

  const periodTxs = useLiveQuery(() => transactionsBetween(period.start, period.end), [period.start, period.end], NONE);
  const everything = useLiveQuery(allTransactions, [], NONE);
  const recent = useLiveQuery(() => recentTransactions(10), [], NONE);

  const month = totals(periodTxs);

  return (
    <div className="pb-20">
      <ScreenHeader eyebrow={`${periodLabel(period)} · ${periodRangeLabel(period)}`} title="Overview" />
      <div className="px-4 space-y-3">
        {!settings.balancePromptDismissed && (
          <StartBalanceCard
            onSet={() => {
              void updateSettings({ balancePromptDismissed: true });
              navigate('/settings?focus=balance');
            }}
            onDismiss={() => void updateSettings({ balancePromptDismissed: true })}
          />
        )}
        <BalanceCard balance={balance(settings.openingBalance, everything)} totals={month} />
        {settings.monthlyBudget !== null && <BudgetBar spent={month.spent} limit={settings.monthlyBudget} />}
        <PresetBar />
        <section>
          <div className="flex items-center justify-between px-1 mb-2 mt-2">
            <h2 className="label-eyebrow">Recent</h2>
            <Link to="/history" className="text-xs font-semibold text-ember-300">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="card p-5 text-center">
              <p className="text-ink-200 font-semibold">No entries yet</p>
              <p className="text-sm text-ink-400 mt-1">Tap + to log your first expense or income.</p>
            </div>
          ) : (
            <DayGroupList groups={groupByDay(recent)} categories={categories} />
          )}
        </section>
      </div>
      <button
        type="button"
        onClick={() => openAdd('expense')}
        aria-label="Add entry"
        className="btn-primary fixed right-5 z-30 w-16 h-16 rounded-2xl p-0"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        <Icon name="plus" size={30} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function StartBalanceCard({ onSet, onDismiss }: { onSet: () => void; onDismiss: () => void }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl grid place-items-center bg-ember-500/15 text-ember-300 shrink-0">
        <Icon name="wallet" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink-50">Set your starting balance</p>
        <p className="text-sm text-ink-300 mt-0.5">Enter the money you have now, so Balance matches your wallet.</p>
        <button type="button" onClick={onSet} className="btn-primary mt-3 py-2 text-sm">
          Set balance
        </button>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="tap -m-2 p-2 text-ink-400">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
