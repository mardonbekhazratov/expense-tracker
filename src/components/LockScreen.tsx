import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useToast } from './ui/Toast';
import { authenticate } from '../lib/biometric';
import { createPromptGuard } from '../lib/lockTiming';
import { updateSettings } from '../db/queries';

/** Opaque cover shown while locked. Prompts on mount and when the owner comes back to the app. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const toast = useToast();
  const busy = useRef(false);
  const guard = useRef(createPromptGuard());
  const [message, setMessage] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const result = await authenticate('Unlock to see your money');
    busy.current = false;
    if (result === 'ok') {
      onUnlock();
      return;
    }
    if (result === 'unavailable') {
      // The phone lost its fingerprint and screen lock: never lock the owner out of their data.
      await updateSettings({ lockEnabled: false });
      toast({ message: 'Fingerprint lock turned off', detail: 'This phone has no fingerprint or screen lock set up.' });
      onUnlock();
      return;
    }
    setMessage(result === 'failed' ? 'Could not verify. Try again.' : null);
  }, [onUnlock, toast]);

  useEffect(() => {
    void unlock();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') guard.current.onHidden(busy.current);
      else if (guard.current.shouldPromptOnVisible()) void unlock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [unlock]);

  return (
    <div className="fixed inset-0 z-[90] bg-ink-950 grid place-items-center px-8 pt-safe pb-safe">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-ember-500/15 text-ember-300">
          <Icon name="lock" size={32} />
        </div>
        <h1 className="display text-3xl text-ink-50 mt-5">Locked</h1>
        <p className="text-sm text-ink-300 mt-2">Use your fingerprint or phone PIN to open Expense Tracker.</p>
        {message && <p className="text-sm text-rose-300 mt-3">{message}</p>}
        <button type="button" onClick={() => void unlock()} className="btn-primary mt-6 px-8 py-3">
          Unlock
        </button>
      </div>
    </div>
  );
}
