import { inst } from '../test-support.js';
import { addMillis, elapsedDays, instantMillis, parseInstant } from './instant.js';

describe('instants', () => {
  it('accepts ISO UTC instants with milliseconds', () => {
    expect(parseInstant('2026-11-27T05:00:00.123Z')).toEqual({
      ok: true,
      value: '2026-11-27T05:00:00.123Z',
    });
  });
  it('rejects other formats and impossible values', () => {
    for (const bad of ['2026-11-27', '2026-11-27T05:00:00Z', '2026-13-27T05:00:00.123Z']) {
      expect(parseInstant(bad)).toEqual({ ok: false, error: { code: 'date.invalid' } });
    }
    expect(parseInstant('2026-11-27T25:00:00.000Z').ok).toBe(false);
  });
  it('measures elapsed days, fractional and negative', () => {
    const a = inst('2026-11-01T00:00:00.000Z');
    expect(elapsedDays(a, inst('2026-11-15T00:00:00.000Z'))).toBe(14);
    expect(elapsedDays(inst('2026-11-15T00:00:00.000Z'), a)).toBe(-14);
    expect(elapsedDays(a, inst('2026-11-01T12:00:00.000Z'))).toBe(0.5);
  });
  it('adds and subtracts milliseconds', () => {
    const at = inst('2026-11-27T05:00:00.000Z');
    expect(addMillis(at, 2_500)).toEqual({ ok: true, value: '2026-11-27T05:00:02.500Z' });
    expect(addMillis(at, -3_600_000)).toEqual({ ok: true, value: '2026-11-27T04:00:00.000Z' });
    expect(instantMillis(at)).toBe(Date.parse('2026-11-27T05:00:00.000Z'));
  });
  it('fails instead of producing an instant outside the supported years', () => {
    const invalid = { ok: false, error: { code: 'date.invalid' } };
    expect(addMillis(inst('9999-12-31T23:59:59.999Z'), 2_000)).toEqual(invalid);
    expect(addMillis(inst('2026-11-27T05:00:00.000Z'), Number.NaN)).toEqual(invalid);
    expect(addMillis(inst('2026-11-27T05:00:00.000Z'), 9e15)).toEqual(invalid);
  });
});
