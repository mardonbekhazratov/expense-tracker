import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompact, formatSom } from '../../lib/money';
import { AXIS_TICK, CURSOR_FILL, GRID_COLOR } from './chartTheme';
import { TooltipCard } from './TooltipCard';

export interface TrendRow {
  key: string;
  label: string;
  title: string;
  amount: number;
}

export function CategoryTrendChart({ data, color, name }: { data: TrendRow[]; color: string; name: string }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval={0} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompact} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: CURSOR_FILL }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as TrendRow;
              return <TooltipCard title={row.title} rows={[{ label: name, value: formatSom(row.amount), swatch: color }]} />;
            }}
          />
          <Bar dataKey="amount" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
