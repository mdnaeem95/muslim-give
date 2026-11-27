/** Retry delays for a failed push (spec 8.3): 2 s, 4 s, 8 s ... capped at 15 minutes, with jitter. */
export const BASE_DELAY_MS = 2_000;
export const MAX_DELAY_MS = 15 * 60 * 1_000;

/**
 * How long to wait before the next try, after `failures` failed tries in a row.
 * `random` is a number in [0, 1) from the caller, so tests are repeatable. Jitter keeps between
 * half and all of the delay, so devices that failed together do not retry together.
 */
export function retryDelayMillis(failures: number, random: number): number {
  const steps = Math.min(Math.max(failures, 1) - 1, 20);
  const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** steps);
  const jitter = 0.5 + Math.min(Math.max(random, 0), 0.999_999) / 2;
  return Math.floor(delay * jitter);
}
