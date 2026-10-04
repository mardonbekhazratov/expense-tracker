import type { Category } from '../db/types';
import { CategoryBadge } from './CategoryBadge';
import { Icon } from './Icon';

interface Props {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddNew: () => void;
}

export function CategoryGrid({ categories, selectedId, onSelect, onAddNew }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id!)}
            aria-pressed={active}
            className={`tap flex flex-col items-center gap-1 rounded-2xl border px-1 py-2
              ${active ? 'bg-ember-500/15 border-ember-500/60' : 'bg-ink-800/40 border-transparent'}`}
          >
            <CategoryBadge category={c} size={32} />
            <span className={`w-full truncate text-[11px] font-semibold ${active ? 'text-ink-50' : 'text-ink-300'}`}>
              {c.name}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddNew}
        className="tap flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink-600 px-1 py-2 text-ink-300"
      >
        <Icon name="plus" size={20} />
        <span className="text-[11px] font-semibold">New</span>
      </button>
    </div>
  );
}
