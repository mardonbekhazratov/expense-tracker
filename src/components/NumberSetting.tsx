import { useEffect, useState, type Ref } from 'react';
import { groupDigits, parseWholeNumber } from '../lib/money';

interface Props {
  label: string;
  hint?: string;
  value: number | null;
  /** What an empty field means: 0 (starting balance) or "off" (budget). */
  emptyMeans: 'zero' | 'off';
  allowNegative?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onSave: (value: number | null) => Promise<void>;
}

/** A whole-som setting saved when the field loses focus or Enter is pressed. */
export function NumberSetting({ label, hint, value, emptyMeans, allowNegative = false, inputRef, onSave }: Props) {
  const [text, setText] = useState('');
  const [negative, setNegative] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focused) return;
    setText(value === null || (value === 0 && emptyMeans === 'off') ? '' : groupDigits(value));
    setNegative((value ?? 0) < 0);
  }, [value, focused, emptyMeans]);

  async function commit(sign = negative) {
    const raw = text.trim();
    let next: number | null;
    if (raw === '') {
      next = emptyMeans === 'off' ? null : 0;
    } else {
      const n = parseWholeNumber(raw);
      if (n === null) {
        setError('Use digits only, in whole som');
        return;
      }
      next = sign && n !== 0 ? -n : n;
      if (emptyMeans === 'off' && next === 0) next = null;
    }
    if (next === value) {
      setError(null);
      return;
    }
    try {
      await onSave(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <p className="label-eyebrow">{label}</p>
      <div className="mt-1 flex gap-2">
        {allowNegative && (
          <button
            type="button"
            onClick={() => {
              const sign = !negative;
              setNegative(sign);
              void commit(sign);
            }}
            aria-label={negative ? 'Make positive' : 'Make negative'}
            className="btn-ghost w-12 text-lg font-bold"
          >
            {negative ? '−' : '+'}
          </button>
        )}
        <input
          ref={inputRef}
          inputMode="numeric"
          value={text}
          placeholder={emptyMeans === 'off' ? 'Off' : '0'}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setFocused(false);
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="field-flat num flex-1"
        />
        <span className="self-center text-sm text-ink-400">so'm</span>
      </div>
      {hint && !error && <p className="text-xs text-ink-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-rose-300 mt-1.5">{error}</p>}
    </div>
  );
}
