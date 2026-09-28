// Digits of a non-negative BigInt in `base`, most significant first.
export function toDigits(n, base) {
  if (n < 0n) throw new RangeError('toDigits expects a non-negative value');
  if (n === 0n) return [0];
  const digits = [];
  for (; n > 0n; n /= base) digits.unshift(Number(n % base));
  return digits;
}

// Parses a whole decimal number (optionally negative) into a BigInt, or null.
// Accepts U+2212 as well as "-", since the page displays that minus sign.
export function parseInteger(text) {
  const trimmed = text.trim().replace(/^\u2212/, '-');
  return /^-?\d+$/.test(trimmed) ? BigInt(trimmed) : null;
}

// Parses "a + b" or "a - b" (whole decimal numbers, U+2212 allowed as a minus) into
// { left, operator, right, result }, or null. BigInt keeps the result exact at any size.
export function parseExpression(text) {
  const match = text.trim().replace(/\u2212/g, '-').match(/^(-?\d+)\s*([+-])\s*(-?\d+)$/);
  if (!match) return null;
  const [left, right] = [BigInt(match[1]), BigInt(match[3])];
  const operator = match[2];
  return { left, operator, right, result: operator === '+' ? left + right : left - right };
}
