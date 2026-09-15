import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDigits, parseInteger } from '../numerals.js';

const BASE = 1026n;

test('zero is a single zero digit', () => {
  assert.deepEqual(toDigits(0n, BASE), [0]);
});

test('numbers below the base are one digit', () => {
  assert.deepEqual(toDigits(25n, BASE), [25]);
  assert.deepEqual(toDigits(1025n, BASE), [1025]);
});

test('numbers at or above the base are positional', () => {
  assert.deepEqual(toDigits(1026n, BASE), [1, 0]);
  assert.deepEqual(toDigits(2026n, BASE), [1, 1000]);
  assert.deepEqual(toDigits(BASE ** 3n, BASE), [1, 0, 0, 0]);
});

test('large values stay exact', () => {
  const n = 123456789012345678901234567890n;
  const digits = toDigits(n, BASE);
  assert.equal(digits.reduce((acc, d) => acc * BASE + BigInt(d), 0n), n);
});

test('negative values are rejected', () => {
  assert.throws(() => toDigits(-1n, BASE), RangeError);
});

test('parseInteger accepts whole numbers', () => {
  assert.equal(parseInteger('42'), 42n);
  assert.equal(parseInteger(' -7 '), -7n);
  assert.equal(parseInteger('00012'), 12n);
  assert.equal(parseInteger('−7'), -7n); // the minus sign the page itself displays
});

test('parseInteger rejects everything else', () => {
  for (const input of ['', ' ', '1.5', '1e3', 'abc', '--1', '0x10']) {
    assert.equal(parseInteger(input), null, input);
  }
});
