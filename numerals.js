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
