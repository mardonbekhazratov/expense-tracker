import type { KeypadKey } from '../lib/money';
import { Icon } from './Icon';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];

/** In-app number pad; som amounts are large, so "000" gets its own key. */
export function AmountKeypad({ onKey }: { onKey: (k: KeypadKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          aria-label={k === 'back' ? 'Delete digit' : k}
          className="tap h-12 rounded-2xl bg-ink-800/60 border border-ink-700/50 text-2xl font-semibold text-ink-50 num active:bg-ink-700/70"
        >
          {k === 'back' ? <Icon name="backspace" size={24} className="mx-auto" /> : k}
        </button>
      ))}
    </div>
  );
}
