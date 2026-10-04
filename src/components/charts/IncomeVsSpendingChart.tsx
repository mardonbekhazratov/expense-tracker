import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PeriodTotals } from '../../lib/stats';
import { formatCompact, formatNet, formatSom, groupDigits } from '../../lib/money';
import { AXIS_TICK, CURSOR_FILL, GRID_COLOR, INCOME_COLOR, SPEND_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

export interface PeriodRow extends PeriodTotals {
  /** Axis label, e.g. "Oct". */
  label: string;
  /** Tooltip/table label, e.g. "Oct 2026". */
  title: string;
}

export function IncomeVsSpendingChart({ data }: { data: PeriodRow[] }) {
  return (
    <div>
      <div className="flex gap-4 text-xs text-ink-300 mb-2" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: INCOME_COLOR }} />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SPEND_COLOR }} />
          Spending
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval={0} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: CURSOR_FILL }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as PeriodRow;
                return (
                  <TooltipCard
                    title={row.title}
                    rows={[
                      { label: 'Income', value: formatSom(row.income), swatch: INCOME_COLOR },
                      { label: 'Spending', value: formatSom(row.spent), swatch: SPEND_COLOR },
                      { label: 'Net', value: formatNet(row.net) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="spent" name="Spending" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="text-xs font-semibold text-ember-300 cursor-pointer">Show as table</summary>
        <table className="w-full mt-2 text-xs num">
          <thead>
            <tr className="text-ink-400 text-right">
              <th className="text-left font-medium py-1">Month</th>
              <th className="font-medium">Income</th>
              <th className="font-medium">Spent</th>
              <th className="font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((r) => (
              <tr key={r.key} className="text-right text-ink-100 border-t border-ink-800/80">
                <td className="text-left py-1.5">{r.title}</td>
                <td>{groupDigits(r.income)}</td>
                <td>{groupDigits(r.spent)}</td>
                <td className={r.net < 0 ? 'text-rose-300' : ''}>{formatNet(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
