// Shared data types. This file has no runtime imports so Node tests can load
// anything that imports it.

export type Kind = 'expense' | 'income';

/** Icons a category can use. Each has a case in components/Icon.tsx. */
export const CATEGORY_ICONS = [
  'food', 'cart', 'transport', 'car', 'phone', 'bolt', 'home', 'health',
  'bag', 'shirt', 'coffee', 'film', 'book', 'users', 'plane', 'dots',
  'wallet', 'briefcase', 'trophy', 'gift', 'coins',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Badge colours (Tailwind classes live in lib/categoryStyle.ts). */
export const CATEGORY_COLORS = [
  'ember', 'amber', 'lime', 'emerald', 'teal', 'sky', 'indigo', 'violet', 'pink', 'rose', 'slate',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface Transaction {
  id?: number;
  /** Always equals the kind of its category. */
  kind: Kind;
  /** Whole som, > 0, at most 12 digits. */
  amount: number;
  categoryId: number;
  /** Local date, YYYY-MM-DD, never in the future. */
  date: string;
  /** '' when empty. */
  note: string;
  /** Epoch ms; orders entries within a day. */
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id?: number;
  /** Unique per kind, case-insensitive. */
  name: string;
  /** Fixed after creation. */
  kind: Kind;
  icon: CategoryIcon;
  color: CategoryColor;
  sortOrder: number;
  /** Hidden from pickers; still labels old entries. */
  archived: boolean;
}

export interface Preset {
  id?: number;
  /** Button label, e.g. "Metro". */
  name: string;
  /** The preset's kind comes from this category. */
  categoryId: number;
  amount: number;
  sortOrder: number;
}

export interface Settings {
  id: 1;
  /** Money on hand before the first entry; may be negative. */
  openingBalance: number;
  /** 1–31; the day each budgeting month starts. */
  monthStartDay: number;
  /** null = no budget. */
  monthlyBudget: number | null;
  lockEnabled: boolean;
  /** Hides Home's "Set your starting balance" card. */
  balancePromptDismissed: boolean;
}
