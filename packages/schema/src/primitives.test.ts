import {
  boundedText,
  civilDateSchema,
  countryCodeSchema,
  currencySchema,
  idSchema,
  instantSchema,
  monthDaySchema,
  monthKeySchema,
  nonNegativeAmountMinorSchema,
  positiveAmountMinorSchema,
} from './primitives.js';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown): boolean =>
  schema.safeParse(v).success;

describe('date primitives reuse the domain parsers', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(ok(civilDateSchema, '2027-03-05')).toBe(true);
    expect(ok(civilDateSchema, '2027-02-30')).toBe(false);
    expect(ok(civilDateSchema, 5)).toBe(false);
    expect(ok(monthKeySchema, '2027-03')).toBe(true);
    expect(ok(monthKeySchema, '2027-13')).toBe(false);
    expect(ok(monthDaySchema, '02-29')).toBe(true);
    expect(ok(monthDaySchema, '04-31')).toBe(false);
    expect(ok(instantSchema, '2027-03-05T00:00:00.000Z')).toBe(true);
    expect(ok(instantSchema, '2027-03-05')).toBe(false);
  });
});

describe('R-MON money primitives', () => {
  it('requires positive integer minor units for a donation', () => {
    expect(ok(positiveAmountMinorSchema, 1250)).toBe(true);
    for (const bad of [0, -5, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, '12']) {
      expect(ok(positiveAmountMinorSchema, bad)).toBe(false);
    }
  });
  it('allows zero where there may be no budget', () => {
    expect(ok(nonNegativeAmountMinorSchema, 0)).toBe(true);
    expect(ok(nonNegativeAmountMinorSchema, -1)).toBe(false);
    expect(ok(nonNegativeAmountMinorSchema, 2.5)).toBe(false);
  });
  it('uses ISO codes', () => {
    expect(ok(currencySchema, 'SGD')).toBe(true);
    expect(ok(currencySchema, 'sgd')).toBe(false);
    expect(ok(countryCodeSchema, 'SG')).toBe(true);
    expect(ok(countryCodeSchema, 'SGP')).toBe(false);
  });
});

describe('ids and text', () => {
  it('accepts UUIDv7s and deterministic IDs, rejects odd characters and length', () => {
    expect(ok(idSchema, '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f')).toBe(true);
    expect(ok(idSchema, 'occ_r1_2027-03')).toBe(true);
    expect(ok(idSchema, 'sg-mosque-sultan')).toBe(true);
    expect(ok(idSchema, '')).toBe(false);
    expect(ok(idSchema, 'has space')).toBe(false);
    expect(ok(idSchema, 'a'.repeat(101))).toBe(false);
  });
  it('trims text and treats empty as an error, not a value', () => {
    const schema = boundedText(5, 'too.long');
    expect(schema.safeParse('  abc ')).toEqual({ success: true, data: 'abc' });
    expect(schema.safeParse('   ').success).toBe(false);
    expect(schema.safeParse('abcdef').success).toBe(false);
  });
});
