import type { Kind } from '../db/types';

const OPTIONS: { kind: Kind; label: string }[] = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
];

export function KindToggle({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  return (
    <div role="radiogroup" aria-label="Entry type" className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-800/60 p-1 border border-ink-700/50">
      {OPTIONS.map((o) => {
        const active = o.kind === value;
        const activeClass = o.kind === 'expense' ? 'bg-ember-500 text-white' : 'bg-emerald-500 text-ink-950';
        return (
          <button
            key={o.kind}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.kind)}
            className={`tap rounded-xl text-sm font-bold ${active ? activeClass : 'text-ink-300'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
