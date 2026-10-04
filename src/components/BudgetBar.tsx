import { budgetStatus, type BudgetLevel } from '../lib/budget';
import { formatSom } from '../lib/money';
import { Icon, type IconName } from './Icon';

// Status colours always come with an icon and words, never colour alone.
const LEVEL: Record<BudgetLevel, { fill: string; track: string; text: string; icon: IconName }> = {
  ok: { fill: 'bg-emerald-500', track: 'bg-emerald-500/15', text: 'text-emerald-300', icon: 'check' },
  warning: { fill: 'bg-amber-400', track: 'bg-amber-400/15', text: 'text-amber-300', icon: 'caution' },
  over: { fill: 'bg-rose-500', track: 'bg-rose-500/15', text: 'text-rose-300', icon: 'caution' },
};

export function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const s = budgetStatus(spent, limit);
  const style = LEVEL[s.level];
  const pct = Math.round(s.ratio * 100);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow">Budget</p>
        <p className={`flex items-center gap-1 text-xs font-semibold ${style.text}`}>
          <Icon name={style.icon} size={14} />
          {s.level === 'over' ? `Over by ${formatSom(-s.remaining)}` : `${formatSom(s.remaining)} left`}
        </p>
      </div>
      <div
        className={`mt-3 h-2.5 rounded-full overflow-hidden ${style.track}`}
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={spent}
      >
        <div className={`h-full rounded-full ${style.fill}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-400 num">
        {formatSom(spent)} of {formatSom(limit)} · {pct}%
      </p>
    </div>
  );
}
