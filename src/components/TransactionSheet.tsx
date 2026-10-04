import { useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { CalendarSheet } from './ui/CalendarSheet';
import { useConfirm } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import { AmountKeypad } from './AmountKeypad';
import { CategoryEditor } from './CategoryEditor';
import { CategoryGrid } from './CategoryGrid';
import { KindToggle } from './KindToggle';
import { Icon } from './Icon';
import { useStore, type SheetState } from '../store/useStore';
import { addTransaction, deleteTransaction, listCategories, updateTransaction, withBudgetCheck } from '../db/queries';
import type { Category, Kind } from '../db/types';
import { amountToDigits, applyKey, digitsToAmount, groupDigits } from '../lib/money';
import { addDaysISO, formatShortDate, todayISO } from '../lib/dates';
import { budgetMessage } from '../lib/budget';

/** The one Add/Edit sheet, opened from anywhere through the store. */
export function TransactionSheet() {
  const sheet = useStore((s) => s.sheet);
  const close = useStore((s) => s.closeSheet);
  return (
    <Sheet
      open={sheet !== null}
      onClose={close}
      eyebrow={sheet?.mode === 'edit' ? 'Edit entry' : 'New entry'}
      maxHeightClass="max-h-[94vh]"
      bodyMaxHeight="86vh"
    >
      {sheet && <TransactionForm key={sheet.nonce} sheet={sheet} onDone={close} />}
    </Sheet>
  );
}

function TransactionForm({ sheet, onDone }: { sheet: NonNullable<SheetState>; onDone: () => void }) {
  const editing = sheet.mode === 'edit' ? sheet.tx : null;
  const today = useMemo(() => todayISO(), []);
  const yesterday = addDaysISO(today, -1);

  const [kind, setKind] = useState<Kind>(sheet.mode === 'edit' ? sheet.tx.kind : sheet.kind);
  const [digits, setDigits] = useState(editing ? amountToDigits(editing.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(editing?.categoryId ?? null);
  const [date, setDate] = useState(editing?.date ?? today);
  const [note, setNote] = useState(editing?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const all = useLiveQuery(() => listCategories(kind, { includeArchived: true }), [kind], [] as Category[]);
  // Hidden categories stay out of the grid, except one an edited entry already uses.
  const categories = all.filter((c) => !c.archived || c.id === categoryId);

  const amount = digitsToAmount(digits);
  const valid = amount > 0 && categoryId !== null && all.some((c) => c.id === categoryId);
  const otherDate = date !== today && date !== yesterday;

  function switchKind(next: Kind) {
    if (next === kind) return;
    setKind(next);
    setCategoryId(null);
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const input = { kind, amount, categoryId: categoryId!, date, note };
    try {
      const crossing = await withBudgetCheck(() =>
        editing ? updateTransaction(editing.id!, input) : addTransaction(input),
      );
      if (crossing) toast({ message: budgetMessage(crossing) });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirm({
      title: 'Delete this entry?',
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteTransaction(editing.id!);
    onDone();
  }

  return (
    <div className="px-4 pt-3 pb-2 space-y-3">
      <KindToggle value={kind} onChange={switchKind} />

      <p className={`text-center text-[44px] leading-none font-bold num tracking-tighter- break-all ${digits ? 'text-ink-50' : 'text-ink-600'}`}>
        {digits ? groupDigits(amount) : '0'}
        <span className="text-lg font-semibold text-ink-400 ml-2">so'm</span>
      </p>

      <CategoryGrid
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onAddNew={() => setEditorOpen(true)}
      />

      <div className="flex gap-2">
        <DateChip active={date === today} onClick={() => setDate(today)}>
          Today
        </DateChip>
        <DateChip active={date === yesterday} onClick={() => setDate(yesterday)}>
          Yesterday
        </DateChip>
        <DateChip active={otherDate} onClick={() => setCalendarOpen(true)}>
          <Icon name="calendar" size={16} />
          {otherDate ? formatShortDate(date) : 'Other'}
        </DateChip>
      </div>

      <TextField
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        enterKeyHint="done"
      />

      <AmountKeypad onKey={(k) => setDigits((d) => applyKey(d, k))} />

      {/* Pinned to the bottom of the sheet so Save never needs a scroll. */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-2 pb-1 bg-ink-900/95 backdrop-blur-sm">
        {error && <p className="text-sm text-rose-300 text-center mb-2">{error}</p>}
        <div className="flex gap-2">
          {editing && (
            <button type="button" onClick={() => void remove()} aria-label="Delete entry" className="btn-ghost px-4 text-rose-300">
              <Icon name="trash" size={20} />
            </button>
          )}
          <button
            type="button"
            disabled={!valid || saving}
            onClick={() => void save()}
            className="btn-primary flex-1 py-3 text-base disabled:opacity-40"
          >
            {editing ? 'Save changes' : kind === 'expense' ? 'Save expense' : 'Save income'}
          </button>
        </div>
      </div>

      <CategoryEditor
        open={editorOpen}
        kind={kind}
        onClose={() => setEditorOpen(false)}
        onSaved={(id) => {
          setCategoryId(id);
          setEditorOpen(false);
        }}
      />
      <CalendarSheet
        open={calendarOpen}
        value={date}
        max={today}
        onClose={() => setCalendarOpen(false)}
        onPick={(d) => {
          setDate(d);
          setCalendarOpen(false);
        }}
      />
    </div>
  );
}

function DateChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold
        ${active ? 'bg-ember-500/15 border-ember-500/50 text-ember-200' : 'bg-ink-800/50 border-ink-700/60 text-ink-300'}`}
    >
      {children}
    </button>
  );
}
