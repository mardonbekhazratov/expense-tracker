// Dates are stored as local calendar dates, "YYYY-MM-DD". Day arithmetic goes
// through UTC so daylight-saving shifts can never skip or repeat a day.

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** m is 1–12. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDaysISO(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** "5 Oct" */
export function formatShortDate(iso: string): string {
  const { m, d } = parseISODate(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "Today", "Yesterday", "Thu, 1 Oct", or "Tue, 30 Dec 2025" for another year. */
export function formatDayHeading(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDaysISO(today, -1)) return 'Yesterday';
  const { y, m, d } = parseISODate(iso);
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const year = y === parseISODate(today).y ? '' : ` ${y}`;
  return `${weekday}, ${d} ${MONTHS_SHORT[m - 1]}${year}`;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
