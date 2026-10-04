/** Leaving the app for at least this long locks it again. */
export const RELOCK_AFTER_MS = 60_000;

/** hiddenAt: when the app went to the background (null if it never did while unlocked). */
export function shouldRelock(hiddenAt: number | null, now: number, lockEnabled: boolean): boolean {
  return lockEnabled && hiddenAt !== null && now - hiddenAt >= RELOCK_AFTER_MS;
}

/**
 * Decides whether coming back to the foreground should open the fingerprint
 * prompt. On Android the prompt runs in its own activity, so it hides and
 * re-shows the page as well; reopening it on that return would turn Cancel
 * into an endless loop.
 */
export function createPromptGuard() {
  let hiddenDuringAuth = false;
  return {
    onHidden(authInProgress: boolean): void {
      hiddenDuringAuth = authInProgress;
    },
    shouldPromptOnVisible(): boolean {
      const fromPrompt = hiddenDuringAuth;
      hiddenDuringAuth = false;
      return !fromPrompt;
    },
  };
}
