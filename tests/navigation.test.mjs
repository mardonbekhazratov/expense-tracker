import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAB_ROOTS, decideBackAction, isTabRoot } from '../src/lib/navigation.ts';

test('Home exits, other tabs go Home, deeper routes go back', () => {
  assert.equal(decideBackAction('/'), 'exit');
  for (const p of ['/history', '/stats', '/settings']) assert.equal(decideBackAction(p), 'home', p);
  assert.equal(decideBackAction('/settings/categories'), 'back');
  assert.equal(decideBackAction('/settings/presets'), 'back');
  assert.equal(decideBackAction('/nope'), 'back');
});

test('isTabRoot', () => {
  for (const p of TAB_ROOTS) assert.equal(isTabRoot(p), true, p);
  assert.equal(isTabRoot('/settings/categories'), false);
});
