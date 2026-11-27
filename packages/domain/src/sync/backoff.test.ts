import { BASE_DELAY_MS, MAX_DELAY_MS, retryDelayMillis } from './backoff.js';

describe('retryDelayMillis (spec 8.3)', () => {
  it('doubles from 2 seconds', () => {
    // random 0 keeps half of the delay; just under 1 keeps nearly all of it.
    expect([1, 2, 3, 4].map((n) => retryDelayMillis(n, 0.999_999))).toEqual([
      1_999, 3_999, 7_999, 15_999,
    ]);
    expect([1, 2, 3].map((n) => retryDelayMillis(n, 0))).toEqual([1_000, 2_000, 4_000]);
  });
  it('is capped at 15 minutes however many failures there are', () => {
    expect(retryDelayMillis(10, 0.999_999)).toBeGreaterThan(MAX_DELAY_MS - 10);
    for (const failures of [10, 50, 10_000]) {
      expect(retryDelayMillis(failures, 0.999_999) < MAX_DELAY_MS).toBe(true);
      expect(retryDelayMillis(failures, 0)).toBe(MAX_DELAY_MS / 2);
    }
  });
  it('always lands between half and all of the delay', () => {
    for (let failures = 1; failures <= 14; failures++) {
      const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (failures - 1));
      for (const random of [0, 0.25, 0.5, 0.75, 0.999_999]) {
        const wait = retryDelayMillis(failures, random);
        expect(wait >= delay / 2).toBe(true);
        expect(wait <= delay).toBe(true);
      }
    }
  });
  it('treats out-of-range input as the nearest valid value', () => {
    expect(retryDelayMillis(0, 0)).toBe(1_000);
    expect(retryDelayMillis(-5, 0)).toBe(1_000);
    expect(retryDelayMillis(1, -3)).toBe(1_000);
    expect(retryDelayMillis(1, 7)).toBe(1_999);
  });
});
