import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { Select } from './ui/Select';
import { useConfirm } from './ui/ConfirmDialog';
import { addPreset, deletePreset, listCategories, updatePreset } from '../db/queries';
import type { Category, Preset } from '../db/types';
import { parseWholeNumber } from '../lib/money';

interface Props {
  open: boolean;
  /** The preset to edit; omit to create one. */
  preset?: Preset;
  onClose: () => void;
}

export function PresetEditor({ open, preset, onClose }: Props) {
  const categories = useLiveQuery(() => listCategories(undefined, { includeArchived: true }), [], [] as Category[]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    setName(preset?.name ?? '');
    setCategoryId(preset?.categoryId ?? null);
    setAmountText(preset ? String(preset.amount) : '');
    setError(null);
    setSaving(false);
  }, [open, preset]);

  // Expense categories first, then income; hidden ones only if already chosen.
  const options = categories
    .filter((c) => !c.archived || c.id === categoryId)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'expense' ? -1 : 1))
    .map((c) => ({ value: String(c.id), label: c.name, hint: c.kind === 'income' ? 'Income' : 'Expense' }));

  async function save() {
    if (saving) return;
    const amount = parseWholeNumber(amountText);
    if (categoryId === null) return setError('Pick a category');
    if (amount === null || amount <= 0) return setError('Enter the amount in whole som');
    setSaving(true);
    try {
      const input = { name, categoryId, amount };
      if (preset) await updatePreset(preset.id!, input);
      else await addPreset(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (!preset) return;
    const ok = await confirm({ title: `Delete "${preset.name}"?`, body: 'Entries already logged stay.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await deletePreset(preset.id!);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Quick add" title={preset ? 'Edit preset' : 'New preset'}>
      <div className="px-4 pt-4 pb-5 space-y-3">
        <TextField eyebrow="Name" placeholder="e.g. Metro" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        <Select
          eyebrow="Category"
          sheetTitle="Category"
          placeholder="Choose a category"
          value={categoryId === null ? '' : String(categoryId)}
          options={options}
          onChange={(v) => setCategoryId(Number(v))}
        />
        <TextField
          eyebrow="Amount (so'm)"
          inputMode="numeric"
          placeholder="2000"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex gap-2 pt-1">
          {preset && (
            <button type="button" onClick={() => void remove()} className="btn-ghost px-4 text-rose-300">
              Delete
            </button>
          )}
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary flex-1 py-3 disabled:opacity-40">
            {preset ? 'Save' : 'Add preset'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
