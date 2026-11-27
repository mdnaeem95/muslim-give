import { occurrenceDonationId } from '../recurring.js';
import { mk } from '../test-support.js';
import { isUuidV7, SINGLETON_IDS, uuidV7 } from './ids.js';

const bytes = (fill: number): number[] => Array.from({ length: 10 }, () => fill);

describe('uuidV7 (spec 7.3)', () => {
  const made = (millis: number, random: number[]): string => {
    const result = uuidV7(millis, random);
    if (!result.ok) throw new Error('bad fixture');
    return result.value;
  };
  it('has the right shape, version and variant', () => {
    for (const fill of [0, 1, 127, 255]) {
      const id = made(1_795_000_000_000, bytes(fill));
      expect(isUuidV7(id)).toBe(true);
      expect(id).toHaveLength(36);
      expect(id.charAt(14)).toBe('7');
      expect('89ab'.includes(id.charAt(19))).toBe(true);
    }
  });
  it('puts the timestamp first, so later IDs sort later', () => {
    expect(made(0, bytes(0)).slice(0, 13)).toBe('00000000-0000');
    expect(made(1_795_000_000_000, bytes(0)).slice(0, 13)).toBe('01a1ee56-5e00');
  });
  it('sorts by time regardless of the random bytes', () => {
    const earlier = made(1_000, bytes(255));
    const later = made(1_001, bytes(0));
    expect(earlier < later).toBe(true);
  });
  it('is the same for the same inputs and different for different random bytes', () => {
    expect(made(5, bytes(9))).toBe(made(5, bytes(9)));
    expect(made(5, bytes(9))).not.toBe(made(5, bytes(10)));
  });
  it('rejects a bad timestamp or bad random input', () => {
    const invalid = { ok: false, error: { code: 'id.invalid_input' } };
    expect(uuidV7(-1, bytes(0))).toEqual(invalid);
    expect(uuidV7(1.5, bytes(0))).toEqual(invalid);
    expect(uuidV7(2 ** 48, bytes(0))).toEqual(invalid);
    expect(uuidV7(5, bytes(0).slice(1))).toEqual(invalid);
    expect(uuidV7(5, [...bytes(0).slice(1), 256])).toEqual(invalid);
    expect(uuidV7(5, [...bytes(0).slice(1), -1])).toEqual(invalid);
    expect(uuidV7(5, [...bytes(0).slice(1), 1.5])).toEqual(invalid);
    expect(uuidV7(2 ** 48 - 1, bytes(0)).ok).toBe(true);
  });
  it('recognises only version 7 UUIDs', () => {
    expect(isUuidV7('018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f')).toBe(true);
    expect(isUuidV7('018f3c2e-7b1a-4c3d-9e2f-1a2b3c4d5e6f')).toBe(false);
    expect(isUuidV7('occ_r1_2027-03')).toBe(false);
  });
});

describe('deterministic IDs (spec 7.3)', () => {
  it('gives monthly giving the same donation ID on every device', () => {
    expect(occurrenceDonationId('r1', mk('2027-03'))).toBe('don_occ_r1_2027-03');
    expect(occurrenceDonationId('r1', mk('2027-03'))).toBe(
      occurrenceDonationId('r1', mk('2027-03')),
    );
    expect(occurrenceDonationId('r1', mk('2027-04'))).not.toBe(
      occurrenceDonationId('r1', mk('2027-03')),
    );
  });
  it('fixes the singleton IDs the database expects', () => {
    expect(SINGLETON_IDS).toEqual({
      profile: 'profile',
      budget: 'budget',
      promptState: 'prompt_state',
    });
  });
});
