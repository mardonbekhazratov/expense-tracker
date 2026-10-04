import { useEffect, useRef, type ReactNode } from 'react';
import { LockScreen } from './LockScreen';
import { useSettings } from '../hooks/useData';
import { useStore } from '../store/useStore';
import { shouldRelock } from '../lib/lockTiming';

/**
 * Keeps the app mounted (an open Add sheet survives) and covers it with the
 * lock screen when locked. The first lock decision is made in main.tsx before
 * the first render; this relocks after a minute in the background.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const locked = useStore((s) => s.locked);
  const setLocked = useStore((s) => s.setLocked);
  const { lockEnabled } = useSettings();
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        if (!useStore.getState().locked) hiddenAt.current = Date.now();
        return;
      }
      if (shouldRelock(hiddenAt.current, Date.now(), lockEnabled)) setLocked(true);
      hiddenAt.current = null;
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [lockEnabled, setLocked]);

  return (
    <>
      {children}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
    </>
  );
}
