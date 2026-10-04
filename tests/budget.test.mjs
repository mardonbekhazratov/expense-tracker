import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetCrossing, budgetMessage, budgetStatus } from '../src/lib/budget.ts';

test('budgetStatus: ok below 80%, warning 80–100%, over above 100%', () => {
  assert.equal(budgetStatus(0, 1000).level, 'ok');
  assert.equal(budgetStatus(799, 1000).level, 'ok');
  assert.equal(budgetStatus(800, 1000).level, 'warning');
  assert.equal(budgetStatus(1000, 1000).level, 'warning');
  assert.equal(budgetStatus(1001, 1000).level, 'over');
  assert.equal(budgetStatus(1200, 1000).remaining, -200);
  assert.equal(budgetStatus(250, 1000).ratio, 0.25);
});

test('budgetCrossing reports only upward moves', () => {
  assert.equal(budgetCrossing(700, 790, 1000), null);
  assert.equal(budgetCrossing(700, 850, 1000)?.level, 'warning');
  assert.equal(budgetCrossing(700, 1100, 1000)?.level, 'over');
  assert.equal(budgetCrossing(850, 1100, 1000)?.level, 'over');
  assert.equal(budgetCrossing(900, 950, 1000), null);
  assert.equal(budgetCrossing(1100, 900, 1000), null);
  assert.equal(budgetCrossing(0, 5000, null), null);
});

test('budgetMessage', () => {
  assert.equal(budgetMessage(budgetStatus(850, 1000)), "85% of this month's budget used");
  assert.equal(budgetMessage(budgetStatus(1500, 1000)), "Over this month's budget by 500 so'm");
});
