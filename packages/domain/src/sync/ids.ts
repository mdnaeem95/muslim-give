import { err, ok, type AppError, type Result } from '../result.js';

/** UUIDv7 text, 8-4-4-4-12 lower-case hex (spec 7.3). */
export type Uuid = string & { readonly __brand: 'Uuid' };

export const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const MAX_UUID_MILLIS = 2 ** 48 - 1;
const RANDOM_BYTES = 10;

const hex = (value: number, width: number): string => value.toString(16).padStart(width, '0');

/**
 * Builds a UUIDv7 from a timestamp and ten random bytes. The caller supplies both, so the domain
 * stays pure and tests are repeatable; the app supplies the clock and a secure random source.
 * IDs made later sort later (time-ordered), and the version and variant bits are fixed.
 */
export function uuidV7(millis: number, random: readonly number[]): Result<Uuid, AppError> {
  const valid =
    Number.isSafeInteger(millis) &&
    millis >= 0 &&
    millis <= MAX_UUID_MILLIS &&
    random.length === RANDOM_BYTES &&
    random.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);
  if (!valid) return err({ code: 'id.invalid_input' });
  const [b0 = 0, b1 = 0, b2 = 0, b3 = 0, ...tail] = random;
  const time = hex(millis, 12);
  const randA = `${hex(b0, 2)}${hex(b1 >> 4, 1)}`;
  const variant = hex((b1 & 0x3) | 0x8, 1);
  const randB = `${variant}${hex(b2, 2)}${hex(b3 & 0xf, 1)}`;
  const last = tail.map((byte) => hex(byte, 2)).join('');
  return ok(`${time.slice(0, 8)}-${time.slice(8)}-7${randA}-${randB}-${last}` as Uuid);
}

export const isUuidV7 = (text: string): boolean => UUID_V7.test(text);

/** Singleton record IDs are fixed (spec 7.3). */
export const SINGLETON_IDS = {
  profile: 'profile',
  budget: 'budget',
  promptState: 'prompt_state',
} as const;
