import { Icon } from './Icon';
import { useSelectedPeriod, useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { periodLabel, periodRangeLabel, shiftPeriod } from '../lib/period';

/** ‹ Oct 2026 › — shared by History and Stats. Tapping the label jumps back to now. */
export function PeriodSwitcher() {
  const { period, isCurrent } = useSelectedPeriod();
  const { monthStartDay } = useSettings();
  const setKey = useStore((s) => s.setSelectedPeriodKey);
  const go = (delta: number) => setKey(shiftPeriod(period, delta, monthStartDay).key);

  return (
    <div className="card flex items-center justify-between px-2 py-1.5">
      <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="tap rounded-xl p-2 text-ink-300 active:bg-ink-800/60">
        <Icon name="chevron-left" size={22} />
      </button>
      <button type="button" onClick={() => setKey(null)} className="tap text-center min-w-0 px-2">
        <span className="block font-semibold text-ink-50">
          {periodLabel(period)}
          {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ember-300">Now</span>}
        </span>
        <span className="block text-xs text-ink-400">{periodRangeLabel(period)}</span>
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={isCurrent}
        aria-label="Next month"
        className="tap rounded-xl p-2 text-ink-300 active:bg-ink-800/60 disabled:opacity-25"
      >
        <Icon name="chevron-right" size={22} />
      </button>
    </div>
  );
}
