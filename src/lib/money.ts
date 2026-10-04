// Amounts are whole Uzbek som stored as integers. The keypad caps input at
// MAX_DIGITS so every value stays far inside Number.MAX_SAFE_INTEGER.
export const MAX_DIGITS = 12;

const GROUP = '\u00a0'; // non-breaking space keeps "45 000" on one line
const MINUS = '−';

/** 45000 → "45 000" (no sign). */
export function groupDigits(n: number): string {
  return String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
}

/** 45000 → "45 000 so'm"; negatives get a real minus sign. */
export function formatSom(n: number): string {
  return `${n < 0 ? MINUS : ''}${groupDigits(n)} so'm`;
}

/** An entry's amount as shown in lists: expense "−45 000", income "+45 000". */
export function formatSigned(amount: number, kind: 'expense' | 'income'): string {
  return `${kind === 'expense' ? MINUS : '+'}${groupDigits(amount)}`;
}

/** A net figure: "+1 500", "−1 500" or "0". */
export function formatNet(n: number): string {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : MINUS}${groupDigits(n)}`;
}

/** Short form for chart axes: 45000 → "45K", 1400000 → "1.4M". */
export function formatCompact(n: number): string {
  const sign = n < 0 ? MINUS : '';
  const a = Math.abs(n);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (a >= size) return `${sign}${(a / size).toFixed(1).replace(/\.0$/, '')}${suffix}`;
  }
  return `${sign}${a}`;
}

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | 'back';

/** Applies one keypad press to the digits typed so far. */
export function applyKey(digits: string, key: KeypadKey): string {
  if (key === 'back') return digits.slice(0, -1);
  if (digits === '' && (key === '0' || key === '000')) return '';
  const next = digits + key;
  return next.length > MAX_DIGITS ? digits : next;
}

export function digitsToAmount(digits: string): number {
  return digits === '' ? 0 : Number(digits);
}

export function amountToDigits(n: number): string {
  return n > 0 ? String(n) : '';
}

/**
 * Parses typed text like "45 000" or "−5000" into whole som.
 * Returns null for anything that is not a whole number of at most MAX_DIGITS.
 */
export function parseWholeNumber(text: string, allowNegative = false): number | null {
  const cleaned = text.replace(/[\s\u00a0]/g, '').replace(/^−/, '-');
  const m = /^(-?)(\d+)$/.exec(cleaned);
  if (!m) return null;
  if (m[1] && !allowNegative) return null;
  const digits = m[2].replace(/^0+(?=\d)/, '');
  if (digits.length > MAX_DIGITS) return null;
  const n = Number(digits);
  return m[1] && n !== 0 ? -n : n;
}
