import { create } from 'zustand';
import type { Kind, Transaction } from '../db/types.ts';
import { EMPTY_FILTER, type TxFilter } from '../lib/filter.ts';

/** The Add/Edit sheet. `nonce` changes on every open so the form state resets. */
export type SheetState =
  | { mode: 'add'; kind: Kind; nonce: number }
  | { mode: 'edit'; tx: Transaction; nonce: number }
  | null;

interface UiState {
  sheet: SheetState;
  openAdd: (kind?: Kind) => void;
  openEdit: (tx: Transaction) => void;
  closeSheet: () => void;

  /** Period ("YYYY-MM") shown on History and Stats; null = the current one. */
  selectedPeriodKey: string | null;
  setSelectedPeriodKey: (key: string | null) => void;

  historyFilter: TxFilter;
  setHistoryFilter: (patch: Partial<TxFilter>) => void;

  /** True while the fingerprint lock screen covers the app. */
  locked: boolean;
  setLocked: (locked: boolean) => void;
}

let nonce = 0;

export const useStore = create<UiState>((set) => ({
  sheet: null,
  openAdd: (kind = 'expense') => set({ sheet: { mode: 'add', kind, nonce: ++nonce } }),
  openEdit: (tx) => set({ sheet: { mode: 'edit', tx, nonce: ++nonce } }),
  closeSheet: () => set({ sheet: null }),

  selectedPeriodKey: null,
  setSelectedPeriodKey: (key) => set({ selectedPeriodKey: key }),

  historyFilter: EMPTY_FILTER,
  setHistoryFilter: (patch) => set((s) => ({ historyFilter: { ...s.historyFilter, ...patch } })),

  locked: false,
  setLocked: (locked) => set({ locked }),
}));
