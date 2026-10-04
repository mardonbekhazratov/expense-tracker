import { useEffect, useState } from 'react';
import { msUntilMidnight, todayISO } from '../lib/dates.ts';

/**
 * Today's local date. Refreshes just after midnight and whenever the app
 * returns to the foreground, so an app left open overnight rolls over to the
 * new day (and the new budgeting month) without a restart.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday(todayISO());
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        refresh();
        schedule();
      }, msUntilMidnight(new Date()) + 1000);
    };
    schedule();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return today;
}
