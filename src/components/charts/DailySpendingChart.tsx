import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DayTotal } from '../../lib/stats';
import { formatCompact, formatSom } from '../../lib/money';
import { formatDayHeading } from '../../lib/dates';
import { AXIS_TEXT, AXIS_TICK, CURSOR_FILL, GRID_COLOR, SPEND_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

interface Props {
  days: DayTotal[];
  average: number;
  today: string;
}

export function DailySpendingChart({ days, average, today }: Props) {
  const data = days.map((d) => ({ ...d, day: Number(d.date.slice(8)) }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: 0 }} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CURSOR_FILL }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={formatDayHeading(payload[0].payload.date, today)}
                  rows={[{ label: 'Spent', value: formatSom(payload[0].payload.spent), swatch: SPEND_COLOR }]}
                />
              ) : null
            }
          />
          {average > 0 && (
            <ReferenceLine
              y={average}
              stroke={AXIS_TEXT}
              strokeWidth={1}
              label={{ value: 'avg', position: 'insideTopRight', fill: AXIS_TEXT, fontSize: 10 }}
            />
          )}
          <Bar dataKey="spent" fill={SPEND_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
