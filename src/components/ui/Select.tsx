import { useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from '../Icon';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  label?: string;
  eyebrow?: string;
  placeholder?: string;
  sheetTitle?: string;
}

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  label,
  eyebrow,
  placeholder = 'Choose…',
  sheetTitle = 'Select',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap w-full text-left rounded-xl bg-ink-900/80
          border border-ink-700/70 px-3.5 py-3
          flex items-center justify-between gap-3
          focus:outline-none focus:border-ember-500/70
          focus:ring-2 focus:ring-ember-500/20"
      >
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
          <p className={`truncate ${selected ? 'text-ink-50 font-semibold' : 'text-ink-400'}`}>
            {selected?.label ?? label ?? placeholder}
          </p>
        </div>
        <Icon name="chevron-down" size={18} className="text-ink-400 shrink-0" />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={eyebrow}
        title={sheetTitle}
      >
        <ul className="p-2 space-y-1">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`tap w-full text-left rounded-xl px-3.5 py-3
                    flex items-center justify-between gap-3 border
                    ${
                      active
                        ? 'bg-ember-500/12 border-ember-500/40'
                        : 'bg-ink-800/40 border-transparent hover:bg-ink-800/70'
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${
                        active ? 'text-ink-50' : 'text-ink-100'
                      }`}
                    >
                      {opt.label}
                    </p>
                    {opt.hint && (
                      <p className="text-xs text-ink-400 mt-0.5 truncate">
                        {opt.hint}
                      </p>
                    )}
                  </div>
                  {active && (
                    <Icon
                      name="check"
                      size={18}
                      className="text-ember-400 shrink-0"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
