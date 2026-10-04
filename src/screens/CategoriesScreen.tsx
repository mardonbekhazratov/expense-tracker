import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { CategoryEditor } from '../components/CategoryEditor';
import { KindToggle } from '../components/KindToggle';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/ui/IconButton';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { deleteCategory, listCategories, moveCategory, setCategoryArchived } from '../db/queries';
import type { Category, Kind } from '../db/types';

const NONE: Category[] = [];

export function CategoriesScreen() {
  const [kind, setKind] = useState<Kind>('expense');
  const rows = useLiveQuery(() => listCategories(kind, { includeArchived: true }), [kind], NONE);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  function openEditor(c?: Category) {
    setEditing(c);
    setEditorOpen(true);
  }

  async function remove(c: Category) {
    const ok = await confirm({ title: `Delete "${c.name}"?`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await deleteCategory(c.id!);
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div>
      <ScreenHeader eyebrow="Settings" title="Categories" backTo="/settings" />
      <div className="px-4 space-y-3 pb-6">
        <KindToggle value={kind} onChange={setKind} />
        <ul className="card divide-y divide-ink-800/80 overflow-hidden">
          {rows.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 pl-3 pr-1.5 py-2">
              <CategoryBadge category={c} size={34} />
              <span className="flex-1 min-w-0">
                <span className={`block truncate font-semibold ${c.archived ? 'text-ink-400' : 'text-ink-50'}`}>{c.name}</span>
                {c.archived && <span className="block text-[10px] uppercase tracking-wider text-ink-500">Hidden</span>}
              </span>
              <IconButton icon="chevron-up" label="Move up" disabled={i === 0} onClick={() => void moveCategory(c.id!, -1)} />
              <IconButton icon="chevron-down" label="Move down" disabled={i === rows.length - 1} onClick={() => void moveCategory(c.id!, 1)} />
              <IconButton icon="edit" label="Edit" onClick={() => openEditor(c)} />
              <IconButton
                icon="archive"
                label={c.archived ? 'Unhide' : 'Hide'}
                tone={c.archived ? 'active' : 'default'}
                onClick={() => void setCategoryArchived(c.id!, !c.archived)}
              />
              <IconButton icon="trash" label="Delete" tone="danger" onClick={() => void remove(c)} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-400 px-1">
          Categories that have entries can't be deleted. Hide them instead: they leave the pickers but old entries keep their names.
        </p>
        <button type="button" onClick={() => openEditor()} className="btn-primary w-full py-3">
          <Icon name="plus" size={18} />
          Add {kind === 'expense' ? 'expense' : 'income'} category
        </button>
      </div>
      <CategoryEditor
        open={editorOpen}
        kind={kind}
        category={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => setEditorOpen(false)}
      />
    </div>
  );
}
