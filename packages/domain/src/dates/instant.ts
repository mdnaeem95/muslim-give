import { err, ok, type Result } from '../result.js';
import type { DateError } from './civil-date.js';

/**
 * An ISO 8601 UTC instant with milliseconds, e.g. `2026-11-27T05:00:00.123Z` (spec 7.2).
 * For audit and ordering only; never shown as a donation date.
 */
export type Instant = string & { readonly __brand: 'Instant' };

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MS_PER_DAY = 86_400_000;

export function parseInstant(text: string): Result<Instant, DateError> {
  if (!INSTANT.test(text) || Number.isNaN(Date.parse(text))) return err({ code: 'date.invalid' });
  return ok(text as Instant);
}

/** Elapsed days from `from` to `to`; fractional, and negative when `to` is earlier. */
export function elapsedDays(from: Instant, to: Instant): number {
  return (Date.parse(to) - Date.parse(from)) / MS_PER_DAY;
}

/** Milliseconds since the Unix epoch. */
export const instantMillis = (at: Instant): number => Date.parse(at);

/** The instant `millis` after `at`; negative moves back. Fails if the result is out of range. */
export function addMillis(at: Instant, millis: number): Result<Instant, DateError> {
  const moved = new Date(Date.parse(at) + millis);
  if (Number.isNaN(moved.getTime())) return err({ code: 'date.invalid' });
  return parseInstant(moved.toISOString());
}
