import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RELOCK_AFTER_MS, createPromptGuard, shouldRelock } from '../src/lib/lockTiming.ts';

test('relocks only when enabled and away for at least a minute', () => {
  assert.equal(RELOCK_AFTER_MS, 60_000);
  assert.equal(shouldRelock(1000, 1000 + 59_999, true), false);
  assert.equal(shouldRelock(1000, 1000 + 60_000, true), true);
  assert.equal(shouldRelock(1000, 1000 + 3_600_000, false), false);
  assert.equal(shouldRelock(null, 1e12, true), false);
});

test('returning from the fingerprint prompt does not reopen it, returning from elsewhere does', () => {
  const guard = createPromptGuard();
  assert.equal(guard.shouldPromptOnVisible(), true, 'first show prompts');
  // The prompt is its own Android activity: the page hides while auth runs.
  guard.onHidden(true);
  assert.equal(guard.shouldPromptOnVisible(), false, 'coming back from the prompt (e.g. after Cancel)');
  // The owner leaves the app from the idle lock screen and comes back.
  guard.onHidden(false);
  assert.equal(guard.shouldPromptOnVisible(), true, 'coming back from another app');
});
