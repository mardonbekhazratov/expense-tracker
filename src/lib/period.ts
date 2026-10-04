import { MONTHS_SHORT, addDaysISO, daysInMonth, formatShortDate, pad2, parseISODate } from './dates.ts';

/**
 * A budgeting "month". With start day S it begins on day min(S, days in that
 * month) and ends the day before the next one begins. It is identified and
 * labelled by the calendar month it starts in, so with S = 10, "2026-10" runs
 * 10 Oct – 9 Nov. Periods are always computed, never stored.
 */
export interface Period {
  key: string;
  year: number;
  /** 1–12 */
  month: number;
  /** First day, inclusive. */
  start: string;
  /** Last day, inclusive. */
  end: string;
}

function startOf(year: number, month: number, startDay: number): string {
  const day = Math.min(startDay, daysInMonth(year, month));
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function fromIndex(index: number): [number, number] {
  return [Math.floor(index / 12), (index % 12) + 1];
}

export function periodFor(year: number, month: number, startDay: number): Period {
  const [ny, nm] = fromIndex(monthIndex(year, month) + 1);
  return {
    key: `${year}-${pad2(month)}`,
    year,
    month,
    start: startOf(year, month, startDay),
    end: addDaysISO(startOf(ny, nm, startDay), -1),
  };
}

export function periodContaining(dateISO: string, startDay: number): Period {
  const { y, m } = parseISODate(dateISO);
  const p = periodFor(y, m, startDay);
  if (dateISO >= p.start) return p;
  const [py, pm] = fromIndex(monthIndex(y, m) - 1);
  return periodFor(py, pm, startDay);
}

export function shiftPeriod(p: Period, delta: number, startDay: number): Period {
  const [y, m] = fromIndex(monthIndex(p.year, p.month) + delta);
  return periodFor(y, m, startDay);
}

/** The `count` periods ending with `p`, oldest first. */
export function periodsEndingWith(p: Period, count: number, startDay: number): Period[] {
  return Array.from({ length: count }, (_, i) => shiftPeriod(p, i - count + 1, startDay));
}

export function periodLabel(p: Period): string {
  return `${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

export function periodShortLabel(p: Period): string {
  return MONTHS_SHORT[p.month - 1];
}

export function periodRangeLabel(p: Period): string {
  return `${formatShortDate(p.start)} – ${formatShortDate(p.end)}`;
}
