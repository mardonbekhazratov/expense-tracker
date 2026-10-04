import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from './ui/Toast';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';
import { PresetEditor } from './PresetEditor';
import { deleteTransaction, listPresets, logPreset, withBudgetCheck } from '../db/queries';
import type { Category, Preset } from '../db/types';
import { useCategoryMap } from '../hooks/useData';
import { useLongPress } from '../hooks/useLongPress';
import { budgetMessage } from '../lib/budget';
import { formatSigned, groupDigits } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';

/** One-tap entries. Tap logs today's entry (with Undo); long-press edits. */
export function PresetBar() {
  const presets = useLiveQuery(listPresets, [], [] as Preset[]);
  const categories = useCategoryMap();
  const toast = useToast();
  const [editing, setEditing] = useState<Preset | null>(null);

  async function log(p: Preset) {
    const category = categories.get(p.categoryId) ?? UNKNOWN_CATEGORY;
    try {
      let id = 0;
      const crossing = await withBudgetCheck(async () => {
        id = await logPreset(p.id!);
      });
      toast({
        message: `${p.name} ${formatSigned(p.amount, category.kind)} so'm`,
        detail: crossing ? budgetMessage(crossing) : undefined,
        actionLabel: 'Undo',
        onAction: () => void deleteTransaction(id),
        durationMs: 5000,
      });
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-2 mt-2">
        <h2 className="label-eyebrow">Quick add</h2>
        <Link to="/settings/presets" className="text-xs font-semibold text-ember-300">
          Edit
        </Link>
      </div>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {presets.map((p) => (
          <PresetChip
            key={p.id}
            preset={p}
            category={categories.get(p.categoryId)}
            onTap={() => void log(p)}
            onLongPress={() => setEditing(p)}
          />
        ))}
        {presets.length === 0 && (
          <Link
            to="/settings/presets"
            className="tap shrink-0 inline-flex items-center gap-2 rounded-2xl border border-dashed border-ink-600 px-4 text-sm font-semibold text-ink-300"
          >
            <Icon name="plus" size={16} />
            Add a preset, e.g. Metro
          </Link>
        )}
      </div>
      <PresetEditor open={editing !== null} preset={editing ?? undefined} onClose={() => setEditing(null)} />
    </section>
  );
}

function PresetChip({
  preset,
  category,
  onTap,
  onLongPress,
}: {
  preset: Preset;
  category?: Category;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const handlers = useLongPress(onLongPress, onTap);
  return (
    <button
      type="button"
      {...handlers}
      className="tap shrink-0 flex items-center gap-2 rounded-2xl bg-ink-800/60 border border-ink-700/50 pl-2 pr-3.5 py-2 select-none"
    >
      <CategoryBadge category={category ?? UNKNOWN_CATEGORY} size={30} />
      <span className="text-left">
        <span className="block text-sm font-semibold text-ink-50 leading-tight">{preset.name}</span>
        <span className="block text-[11px] text-ink-400 num">{groupDigits(preset.amount)}</span>
      </span>
    </button>
  );
}
