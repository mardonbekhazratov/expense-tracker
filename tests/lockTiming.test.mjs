import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RELOCK_AFTER_MS, shouldRelock } from '../src/lib/lockTiming.ts';

test('relocks only when enabled and away for at least a minute', () => {
  assert.equal(RELOCK_AFTER_MS, 60_000);
  assert.equal(shouldRelock(1000, 1000 + 59_999, true), false);
  assert.equal(shouldRelock(1000, 1000 + 60_000, true), true);
  assert.equal(shouldRelock(1000, 1000 + 3_600_000, false), false);
  assert.equal(shouldRelock(null, 1e12, true), false);
});
