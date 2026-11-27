import { exponentOf, fromMinor, needsSanityConfirmation, parseMajor, sum } from './money.js';

const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? 'ok' : r.error?.code);

describe('R-MON-1 fromMinor', () => {
  it('accepts positive integers', () => {
    expect(fromMinor(1250, 'SGD')).toEqual({
      ok: true,
      value: { amountMinor: 1250, currency: 'SGD' },
    });
  });
  it('rejects bad currency codes', () => {
    expect(code(fromMinor(100, 'sgd'))).toBe('money.invalid_currency');
    expect(code(fromMinor(100, 'SG'))).toBe('money.invalid_currency');
  });
  it('rejects non-integers and unsafe integers', () => {
    expect(code(fromMinor(1.5, 'SGD'))).toBe('money.invalid_amount');
    expect(code(fromMinor(Number.MAX_SAFE_INTEGER + 1, 'SGD'))).toBe('money.invalid_amount');
    expect(code(fromMinor(Number.NaN, 'SGD'))).toBe('money.invalid_amount');
  });
  it('rejects zero and negatives', () => {
    expect(code(fromMinor(0, 'SGD'))).toBe('money.not_positive');
    expect(code(fromMinor(-1, 'SGD'))).toBe('money.not_positive');
  });
});

describe('R-MON-2 exponents', () => {
  it('uses 2 by default and the ISO exceptions otherwise', () => {
    expect(exponentOf('SGD')).toBe(2);
    expect(exponentOf('JPY')).toBe(0);
    expect(exponentOf('KWD')).toBe(3);
    expect(exponentOf('CLF')).toBe(4);
  });
});

describe('R-MON-3 parseMajor', () => {
  it('parses without floating point', () => {
    expect(parseMajor('12.50', 'SGD')).toEqual({
      ok: true,
      value: { amountMinor: 1250, currency: 'SGD' },
    });
    expect(parseMajor('12.5', 'SGD')).toEqual({
      ok: true,
      value: { amountMinor: 1250, currency: 'SGD' },
    });
    expect(parseMajor('12', 'SGD')).toEqual({
      ok: true,
      value: { amountMinor: 1200, currency: 'SGD' },
    });
    expect(parseMajor('50000', 'IDR')).toEqual({
      ok: true,
      value: { amountMinor: 5000000, currency: 'IDR' },
    });
    expect(parseMajor('1.250', 'KWD')).toEqual({
      ok: true,
      value: { amountMinor: 1250, currency: 'KWD' },
    });
    expect(parseMajor('0.30', 'SGD')).toEqual({
      ok: true,
      value: { amountMinor: 30, currency: 'SGD' },
    });
    expect(parseMajor(' 7 ', 'JPY')).toEqual({
      ok: true,
      value: { amountMinor: 7, currency: 'JPY' },
    });
  });
  it('rejects extra decimals instead of rounding', () => {
    expect(code(parseMajor('12.505', 'SGD'))).toBe('money.too_many_decimals');
    expect(code(parseMajor('1.5', 'JPY'))).toBe('money.too_many_decimals');
  });
  it('rejects malformed input', () => {
    for (const bad of ['', 'abc', '-5', '1,000', '1e3', '.5', '5.']) {
      expect(code(parseMajor(bad, 'SGD'))).toBe('money.invalid_amount');
    }
    expect(code(parseMajor('0', 'SGD'))).toBe('money.not_positive');
    expect(code(parseMajor('5', 'xx'))).toBe('money.invalid_currency');
  });
});

describe('R-MON-4 sum', () => {
  const a = { amountMinor: 1000, currency: 'SGD' } as const;
  const b = { amountMinor: 250, currency: 'SGD' } as const;
  it('adds amounts of one currency', () => {
    expect(sum('SGD', [a, b])).toEqual({ ok: true, value: { amountMinor: 1250, currency: 'SGD' } });
  });
  it('returns null for an empty list', () => {
    expect(sum('SGD', [])).toEqual({ ok: true, value: null });
  });
  it('refuses to mix currencies', () => {
    expect(code(sum('SGD', [a, { amountMinor: 5, currency: 'MYR' } as never]))).toBe(
      'money.invalid_currency',
    );
  });
  it('detects overflow', () => {
    const big = { amountMinor: Number.MAX_SAFE_INTEGER, currency: 'SGD' } as const;
    expect(code(sum('SGD', [big, b]))).toBe('money.too_large');
  });
});

describe('R-MON-5 sanity bound', () => {
  it('asks above 1,000,000 major units only', () => {
    expect(needsSanityConfirmation({ amountMinor: 100_000_000, currency: 'SGD' })).toBe(false);
    expect(needsSanityConfirmation({ amountMinor: 100_000_001, currency: 'SGD' })).toBe(true);
    expect(needsSanityConfirmation({ amountMinor: 1_000_001, currency: 'JPY' })).toBe(true);
  });
});
