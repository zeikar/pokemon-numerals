import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDigits, parseInteger, parseExpression } from '../numerals.js';

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

test('parseExpression adds and subtracts', () => {
  assert.deepEqual(parseExpression('1 + 1'), { left: 1n, operator: '+', right: 1n, result: 2n });
  assert.deepEqual(parseExpression('25-30'), { left: 25n, operator: '-', right: 30n, result: -5n });
  assert.equal(parseExpression(' -7 + 3 ').result, -4n);
  assert.equal(parseExpression('1 - -1').result, 2n);
  assert.equal(parseExpression('5 \u2212 \u22127').result, 12n); // the minus sign the page itself displays
});

test('sums carry and borrow in the base', () => {
  assert.deepEqual(toDigits(parseExpression('1 + 1').result, BASE), [2]); // Bulbasaur + Bulbasaur = Ivysaur
  assert.deepEqual(toDigits(parseExpression('1025 + 1').result, BASE), [1, 0]);
  assert.deepEqual(toDigits(parseExpression('1026 - 1').result, BASE), [1025]);
  assert.deepEqual(toDigits(parseExpression('151 + 1').result, 152n), [1, 0]); // Gen 1
});

test('sums of large values stay exact', () => {
  const a = 123456789012345678901234567890n;
  assert.equal(parseExpression(`${a} + ${a}`).result, 2n * a);
  assert.equal(parseExpression(`${a} - ${a + 1n}`).result, -1n);
});

test('parseExpression rejects everything else', () => {
  for (const input of ['', '42', '-7', '1 +', '+ 1', '1 + 1 + 1', '1 * 2', '1.5 + 1', '1 ++ 1', 'a + b']) {
    assert.equal(parseExpression(input), null, input);
  }
});
