import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_DIGITS,
  amountToDigits,
  applyKey,
  digitsToAmount,
  formatCompact,
  formatNet,
  formatSigned,
  formatSom,
  groupDigits,
  parseWholeNumber,
} from '../src/lib/money.ts';

const NB = '\u00a0';

test('groupDigits groups thousands with non-breaking spaces', () => {
  assert.equal(groupDigits(0), '0');
  assert.equal(groupDigits(999), '999');
  assert.equal(groupDigits(1000), `1${NB}000`);
  assert.equal(groupDigits(45000), `45${NB}000`);
  assert.equal(groupDigits(1234567), `1${NB}234${NB}567`);
  assert.equal(groupDigits(-45000), `45${NB}000`);
});

test("formatSom adds so'm and a real minus sign", () => {
  assert.equal(formatSom(45000), `45${NB}000 so'm`);
  assert.equal(formatSom(0), "0 so'm");
  assert.equal(formatSom(-2000), `−2${NB}000 so'm`);
});

test('formatSigned marks expenses and income', () => {
  assert.equal(formatSigned(45000, 'expense'), `−45${NB}000`);
  assert.equal(formatSigned(5000000, 'income'), `+5${NB}000${NB}000`);
});

test('formatNet signs positive and negative, leaves zero bare', () => {
  assert.equal(formatNet(1500), `+1${NB}500`);
  assert.equal(formatNet(-1500), `−1${NB}500`);
  assert.equal(formatNet(0), '0');
});

test('formatCompact shortens large numbers for chart axes', () => {
  assert.equal(formatCompact(0), '0');
  assert.equal(formatCompact(950), '950');
  assert.equal(formatCompact(1500), '1.5K');
  assert.equal(formatCompact(45000), '45K');
  assert.equal(formatCompact(1400000), '1.4M');
  assert.equal(formatCompact(2000000), '2M');
  assert.equal(formatCompact(3000000000), '3B');
  assert.equal(formatCompact(-45000), '−45K');
});

test('applyKey builds digits, ignores leading zeros and caps length', () => {
  assert.equal(applyKey('', '0'), '');
  assert.equal(applyKey('', '000'), '');
  assert.equal(applyKey('', '5'), '5');
  assert.equal(applyKey('5', '000'), '5000');
  assert.equal(applyKey('5000', 'back'), '500');
  assert.equal(applyKey('', 'back'), '');
  const full = '9'.repeat(MAX_DIGITS);
  assert.equal(applyKey(full, '1'), full);
  const almost = '9'.repeat(MAX_DIGITS - 2);
  assert.equal(applyKey(almost, '000'), almost);
});

test('digits and amounts convert both ways', () => {
  assert.equal(digitsToAmount(''), 0);
  assert.equal(digitsToAmount('45000'), 45000);
  assert.equal(amountToDigits(45000), '45000');
  assert.equal(amountToDigits(0), '');
});

test('parseWholeNumber accepts grouped digits and optional sign', () => {
  assert.equal(parseWholeNumber('45 000'), 45000);
  assert.equal(parseWholeNumber(`45${NB}000`), 45000);
  assert.equal(parseWholeNumber('007'), 7);
  assert.equal(parseWholeNumber('0'), 0);
  assert.equal(parseWholeNumber(''), null);
  assert.equal(parseWholeNumber('1.5'), null);
  assert.equal(parseWholeNumber('12a'), null);
  assert.equal(parseWholeNumber('-5'), null);
  assert.equal(parseWholeNumber('-5', true), -5);
  assert.equal(parseWholeNumber('−5 000', true), -5000);
  assert.equal(Object.is(parseWholeNumber('-0', true), 0), true);
  assert.equal(parseWholeNumber('9'.repeat(MAX_DIGITS + 1)), null);
});
