import { useEffect, useState } from 'react';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';
import { addCategory, updateCategory } from '../db/queries';
import { CATEGORY_COLORS, CATEGORY_ICONS, type Category, type CategoryColor, type CategoryIcon, type Kind } from '../db/types';
import { SWATCH_CLASSES } from '../lib/categoryStyle';

interface Props {
  open: boolean;
  kind: Kind;
  /** The category to edit; omit to create a new one. */
  category?: Category;
  onClose: () => void;
  onSaved: (id: number) => void;
}

export function CategoryEditor({ open, kind, category, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon>('dots');
  const [color, setColor] = useState<CategoryColor>('sky');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setIcon(category?.icon ?? 'dots');
    setColor(category?.color ?? 'sky');
    setError(null);
    setSaving(false);
  }, [open, category]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      let id: number;
      if (category) {
        await updateCategory(category.id!, { name, icon, color });
        id = category.id!;
      } else {
        id = await addCategory({ name, kind, icon, color });
      }
      onSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={kind === 'expense' ? 'Expense category' : 'Income category'}
      title={category ? 'Edit category' : 'New category'}
    >
      <div className="px-4 pt-4 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <CategoryBadge category={{ icon, color }} size={44} />
          <div className="flex-1">
            <TextField placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          </div>
        </div>
        <div>
          <p className="label-eyebrow mb-2">Icon</p>
          <div className="grid grid-cols-7 gap-1.5">
            {CATEGORY_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                aria-label={i}
                aria-pressed={i === icon}
                className={`tap grid place-items-center rounded-xl h-11 border
                  ${i === icon ? 'border-ember-500/60 bg-ember-500/15 text-ember-200' : 'border-transparent bg-ink-800/50 text-ink-300'}`}
              >
                <Icon name={i} size={20} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label-eyebrow mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={c === color}
                className={`w-9 h-9 rounded-full grid place-items-center ${SWATCH_CLASSES[c]}
                  ${c === color ? 'ring-2 ring-offset-2 ring-offset-ink-900 ring-ink-50' : ''}`}
              >
                {c === color && <Icon name="check" size={16} className="text-ink-950" />}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || name.trim() === ''}
          className="btn-primary w-full py-3 disabled:opacity-40"
        >
          {category ? 'Save' : 'Add category'}
        </button>
      </div>
    </Sheet>
  );
}
