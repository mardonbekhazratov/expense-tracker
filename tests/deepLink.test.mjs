import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeepLink } from '../src/lib/deepLink.ts';

test('parses the widget links', () => {
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=income'), { type: 'add', kind: 'income' });
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=expense'), { type: 'add', kind: 'expense' });
  assert.deepEqual(parseDeepLink('expensetracker://add'), { type: 'add', kind: 'expense' });
  assert.deepEqual(parseDeepLink('expensetracker://add?kind=weird'), { type: 'add', kind: 'expense' });
});

test('ignores anything else', () => {
  assert.equal(parseDeepLink('https://add?kind=income'), null);
  assert.equal(parseDeepLink('expensetracker://other'), null);
  assert.equal(parseDeepLink('not a url'), null);
  assert.equal(parseDeepLink(''), null);
});
