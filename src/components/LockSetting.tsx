import { useState } from 'react';
import { useToast } from './ui/Toast';
import { Icon } from './Icon';
import { updateSettings } from '../db/queries';
import { authenticate, lockAvailable } from '../lib/biometric';

export function LockSetting({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await updateSettings({ lockEnabled: false });
        return;
      }
      if (!(await lockAvailable())) {
        toast({ message: 'Set up a fingerprint or screen lock on the phone first' });
        return;
      }
      // Prove it works before turning it on, so the owner can't lock themselves out.
      if ((await authenticate('Confirm to turn on the lock')) === 'ok') {
        await updateSettings({ lockEnabled: true });
        toast({ message: 'Fingerprint lock is on' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => void toggle()}
      className="tap w-full flex items-center gap-3 -mx-1 px-1 rounded-xl text-left active:bg-ink-800/50"
    >
      <Icon name="lock" size={20} className="text-ink-300" />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-ink-100">Fingerprint lock</span>
        <span className="block text-xs text-ink-400">Asks again after a minute away. Phone PIN works too.</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-ember-500' : 'bg-ink-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
