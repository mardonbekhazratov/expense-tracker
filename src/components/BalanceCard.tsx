import type { Totals } from '../lib/stats';
import { formatNet, formatSom, groupDigits } from '../lib/money';

export function BalanceCard({ balance, totals }: { balance: number; totals: Totals }) {
  return (
    <div className="card p-5">
      <p className="label-eyebrow">Balance</p>
      <p
        className={`mt-1 text-[clamp(28px,9vw,40px)] leading-tight font-bold tracking-tighter- break-words
          ${balance < 0 ? 'text-rose-300' : 'text-ink-50'}`}
      >
        {formatSom(balance)}
      </p>
      <p className="label-eyebrow mt-4 pt-4 border-t border-ink-800/80">This month</p>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Figure label="Income" value={groupDigits(totals.income)} className="text-emerald-300" />
        <Figure label="Spent" value={groupDigits(totals.spent)} className="text-ink-50" />
        <Figure label="Net" value={formatNet(totals.net)} className={totals.net < 0 ? 'text-rose-300' : 'text-ink-50'} />
      </div>
    </div>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-ink-400 font-medium">{label}</p>
      <p className={`text-base font-semibold num break-words ${className}`}>{value}</p>
    </div>
  );
}
