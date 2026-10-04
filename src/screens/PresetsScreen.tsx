import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { CategoryBadge } from '../components/CategoryBadge';
import { PresetEditor } from '../components/PresetEditor';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/ui/IconButton';
import { listPresets, movePreset } from '../db/queries';
import type { Preset } from '../db/types';
import { useCategoryMap } from '../hooks/useData';
import { formatSigned } from '../lib/money';
import { UNKNOWN_CATEGORY } from '../lib/categoryStyle';

const NONE: Preset[] = [];

export function PresetsScreen() {
  const presets = useLiveQuery(listPresets, [], NONE);
  const categories = useCategoryMap();
  const [editing, setEditing] = useState<Preset | undefined>(undefined);
  const [editorOpen, setEditorOpen] = useState(false);

  function openEditor(p?: Preset) {
    setEditing(p);
    setEditorOpen(true);
  }

  return (
    <div>
      <ScreenHeader eyebrow="Settings" title="Quick add" backTo="/settings" />
      <div className="px-4 space-y-3 pb-6">
        <p className="text-sm text-ink-300 px-1">
          Presets appear on Home. One tap logs the amount for today; hold a preset to edit it.
        </p>
        {presets.length > 0 && (
          <ul className="card divide-y divide-ink-800/80 overflow-hidden">
            {presets.map((p, i) => {
              const c = categories.get(p.categoryId) ?? UNKNOWN_CATEGORY;
              return (
                <li key={p.id} className="flex items-center gap-2 pl-3 pr-1.5 py-2">
                  <CategoryBadge category={c} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-semibold text-ink-50">{p.name}</span>
                    <span className="block truncate text-xs text-ink-400 num">
                      {c.name} · {formatSigned(p.amount, c.kind)} so'm
                    </span>
                  </span>
                  <IconButton icon="chevron-up" label="Move up" disabled={i === 0} onClick={() => void movePreset(p.id!, -1)} />
                  <IconButton icon="chevron-down" label="Move down" disabled={i === presets.length - 1} onClick={() => void movePreset(p.id!, 1)} />
                  <IconButton icon="edit" label="Edit" onClick={() => openEditor(p)} />
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" onClick={() => openEditor()} className="btn-primary w-full py-3">
          <Icon name="plus" size={18} />
          New preset
        </button>
      </div>
      <PresetEditor open={editorOpen} preset={editing} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
