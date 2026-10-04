import { useEffect, useMemo, useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from '../Icon';
import { MONTHS_LONG, daysInMonth, pad2, parseISODate, todayISO } from '../../lib/dates';

interface Props {
  open: boolean;
  value: string;
  /** Latest pickable date (inclusive). */
  max?: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}

function monthOf(iso: string) {
  const { y, m } = parseISODate(iso);
  return { y, m };
}

/** ISO dates of one month in a Monday-first grid; null pads the first week. */
function buildGrid(y: number, m: number): (string | null)[] {
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) cells.push(`${y}-${pad2(m)}-${pad2(d)}`);
  return cells;
}

export function CalendarSheet({ open, value, max, onPick, onClose }: Props) {
  const [view, setView] = useState(() => monthOf(value));
  useEffect(() => {
    if (open) setView(monthOf(value));
  }, [open, value]);

  const today = todayISO();
  const cells = useMemo(() => buildGrid(view.y, view.m), [view]);
  const atMax = !!max && `${view.y}-${pad2(view.m)}` >= max.slice(0, 7);

  function shift(delta: number) {
    const idx = view.y * 12 + (view.m - 1) + delta;
    setView({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Date" title={`${MONTHS_LONG[view.m - 1]} ${view.y}`}>
      <div className="px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="tap rounded-full p-2 text-ink-300 active:bg-ink-800/60">
            <Icon name="chevron-left" size={20} />
          </button>
          <button type="button" onClick={() => setView(monthOf(today))} className="tap text-xs uppercase tracking-[0.18em] text-ink-400 px-3">
            Today
          </button>
          <button type="button" onClick={() => shift(1)} disabled={atMax} aria-label="Next month" className="tap rounded-full p-2 text-ink-300 active:bg-ink-800/60 disabled:opacity-30">
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] uppercase tracking-[0.18em] text-ink-500 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const disabled = !!max && c > max;
            const selected = c === value;
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => onPick(c)}
                className={`relative h-10 rounded-xl text-sm num
                  ${selected ? 'bg-ember-500 text-white font-bold shadow-glow' : 'text-ink-100 active:bg-ink-800/70'}
                  ${disabled ? 'opacity-30' : ''}`}
              >
                {Number(c.slice(8))}
                {c === today && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ember-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
