import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { DEFAULT_SETTINGS } from '../db/seed.ts';
import { getSettings } from '../db/queries.ts';
import type { Category, Settings } from '../db/types.ts';
import { periodContaining, periodFor, type Period } from '../lib/period.ts';
import { useStore } from '../store/useStore.ts';
import { useToday } from './useToday.ts';

// The last settings read, used as the first-render value of useSettings() so
// screens don't flash defaults (e.g. the wrong month) before the query resolves.
let latestSettings: Settings = DEFAULT_SETTINGS;

export function primeSettings(s: Settings): void {
  latestSettings = s;
}

async function readSettings(): Promise<Settings> {
  latestSettings = await getSettings();
  return latestSettings;
}

export function useSettings(): Settings {
  return useLiveQuery(readSettings, [], latestSettings);
}

/** Every category, hidden ones included, by id — for labelling entries. */
export function useCategoryMap(): Map<number, Category> {
  const rows = useLiveQuery(() => db.categories.toArray(), [], [] as Category[]);
  return useMemo(() => new Map(rows.map((c) => [c.id!, c])), [rows]);
}

export function useCurrentPeriod(): Period {
  const today = useToday();
  const { monthStartDay } = useSettings();
  return useMemo(() => periodContaining(today, monthStartDay), [today, monthStartDay]);
}

/** The period History and Stats show; never later than the current one. */
export function useSelectedPeriod(): { period: Period; current: Period; isCurrent: boolean } {
  const current = useCurrentPeriod();
  const { monthStartDay } = useSettings();
  const key = useStore((s) => s.selectedPeriodKey);
  const period = useMemo(() => {
    if (!key || key >= current.key) return current;
    const [y, m] = key.split('-').map(Number);
    return periodFor(y, m, monthStartDay);
  }, [key, current, monthStartDay]);
  return { period, current, isCurrent: period.key === current.key };
}
