import { inst } from '../test-support.js';
import { elapsedDays, parseInstant } from './instant.js';

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
});
