import { ALLOWED_FIELDS, COLLECTIONS, isCode, sanitiseFields } from './fields.js';

describe('isCode: only stable codes, never data', () => {
  it('accepts codes and screen names', () => {
    for (const ok of [
      'sync.push_failed',
      'dashboard',
      'log-donation',
      'auth/invalid-credential',
      'a',
    ]) {
      expect(isCode(ok)).toBe(true);
    }
  });
  it('rejects free text, emails, names, identifiers and numbers', () => {
    const bad = [
      '',
      'Paid S$12.50 to Aisyah',
      'isa@example.com',
      'Aisyah',
      'has space',
      '12.50',
      'sync.push_failed.2027',
      '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f',
      'deadbeefcafe1234',
      'a'.repeat(65),
      5,
      null,
      undefined,
      {},
    ];
    for (const value of bad) expect(isCode(value)).toBe(false);
  });
});

describe('sanitiseFields (spec 18.1, threat T8)', () => {
  it('keeps allow-listed fields with valid values', () => {
    const result = sanitiseFields({
      code: 'sync.failed',
      screen: 'dashboard',
      collection: 'donations',
      provider: 'google',
      os: 'ios',
      outboxBucket: '1-10',
      durationMs: 1200,
      count: 0,
      attempts: 3,
    });
    expect(result.dropped).toBe(0);
    expect(Object.keys(result.fields)).toHaveLength(9);
  });
  it('drops every field that could hold personal data, by name', () => {
    const result = sanitiseFields({
      amount: 1250,
      amountMinor: 1250,
      name: 'Aisyah',
      recipientName: 'Masjid Sultan',
      note: 'for Mak',
      email: 'isa@example.com',
      income: 5000,
      receiptFileName: 'receipt.jpg',
      recordId: '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f',
      constructor: 'x',
      toString: 'x',
    });
    expect(result.fields).toEqual({});
    expect(result.dropped).toBe(11);
  });
  it('drops an allowed field whose value is not allowed', () => {
    const result = sanitiseFields({
      code: 'Paid S$12.50',
      screen: 5,
      collection: 'secrets',
      provider: 'facebook',
      os: 'windows',
      outboxBucket: '11',
      durationMs: -1,
      count: 1.5,
      attempts: 1_001,
    });
    expect(result.fields).toEqual({});
    expect(result.dropped).toBe(9);
  });
  it('checks number bounds and types', () => {
    expect(sanitiseFields({ durationMs: 86_400_000 }).dropped).toBe(0);
    expect(sanitiseFields({ durationMs: 86_400_001 }).dropped).toBe(1);
    expect(sanitiseFields({ count: '3' }).dropped).toBe(1);
    expect(sanitiseFields({ count: Number.NaN }).dropped).toBe(1);
  });
  it('does not keep a refused name or value anywhere in the result', () => {
    const result = sanitiseFields({ recipientName: 'Aisyah Binte Karim' });
    expect(JSON.stringify(result)).not.toContain('Aisyah');
    expect(JSON.stringify(result)).not.toContain('recipientName');
  });
  it('lists its allowed field names and collections', () => {
    expect(ALLOWED_FIELDS).toContain('code');
    expect(ALLOWED_FIELDS).not.toContain('amount');
    expect(COLLECTIONS).toContain('donations');
  });
});
