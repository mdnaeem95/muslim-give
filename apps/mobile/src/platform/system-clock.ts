import { parseInstant, type Instant } from '@muslim-give/domain';
import type { LocalDay } from '../lib/clock';

/** The one file that reads the system clock (spec 6.2). Everything else asks the Clock. */
export function readSystemDay(): LocalDay {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Milliseconds from now to the next local midnight, when "today" changes. */
export function millisUntilLocalMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/** The current instant, for audit timestamps such as when a migration ran. */
export function readSystemInstant(): Instant {
  const parsed = parseInstant(new Date().toISOString());
  if (!parsed.ok) throw new Error('clock.invalid_instant');
  return parsed.value;
}
