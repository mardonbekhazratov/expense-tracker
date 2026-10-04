/** Leaving the app for at least this long locks it again. */
export const RELOCK_AFTER_MS = 60_000;

/** hiddenAt: when the app went to the background (null if it never did while unlocked). */
export function shouldRelock(hiddenAt: number | null, now: number, lockEnabled: boolean): boolean {
  return lockEnabled && hiddenAt !== null && now - hiddenAt >= RELOCK_AFTER_MS;
}
