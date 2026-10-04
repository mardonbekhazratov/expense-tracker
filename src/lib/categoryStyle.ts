import type { Category, CategoryColor } from '../db/types.ts';

// Literal class strings so Tailwind's scanner keeps them in the build.
export const BADGE_CLASSES: Record<CategoryColor, string> = {
  ember: 'bg-ember-500/15 text-ember-300',
  amber: 'bg-amber-500/15 text-amber-300',
  lime: 'bg-lime-500/15 text-lime-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  teal: 'bg-teal-500/15 text-teal-300',
  sky: 'bg-sky-500/15 text-sky-300',
  indigo: 'bg-indigo-500/15 text-indigo-300',
  violet: 'bg-violet-500/15 text-violet-300',
  pink: 'bg-pink-500/15 text-pink-300',
  rose: 'bg-rose-500/15 text-rose-300',
  slate: 'bg-ink-500/25 text-ink-200',
};

export const SWATCH_CLASSES: Record<CategoryColor, string> = {
  ember: 'bg-ember-400',
  amber: 'bg-amber-400',
  lime: 'bg-lime-400',
  emerald: 'bg-emerald-400',
  teal: 'bg-teal-400',
  sky: 'bg-sky-400',
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
  pink: 'bg-pink-400',
  rose: 'bg-rose-400',
  slate: 'bg-ink-300',
};

/** Shown if an entry's category row is somehow missing (never expected). */
export const UNKNOWN_CATEGORY: Category = {
  name: 'Unknown',
  kind: 'expense',
  icon: 'dots',
  color: 'slate',
  sortOrder: 0,
  archived: false,
};
