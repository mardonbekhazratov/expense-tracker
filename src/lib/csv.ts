import type { Transaction } from '../db/types.ts';

const HEADER = ['Date', 'Type', 'Category', 'Amount', 'Note'];

// Excel only reads UTF-8 CSV (Uzbek/Russian notes) correctly with a byte-order mark.
const BOM = '﻿';

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV of the given entries, oldest first. */
export function buildCsv(txs: readonly Transaction[], categoryName: (id: number) => string): string {
  const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const lines = [HEADER.join(',')];
  for (const t of rows) {
    lines.push(
      [t.date, t.kind === 'expense' ? 'Expense' : 'Income', categoryName(t.categoryId), String(t.amount), t.note]
        .map(cell)
        .join(','),
    );
  }
  return BOM + lines.join('\r\n') + '\r\n';
}
