import {
  parseCivilDate,
  parseMonthDay,
  type CivilDate,
  type MonthDay,
  type MonthKey,
} from './dates/civil-date.js';
import { parseInstant, type Instant } from './dates/instant.js';
import { parseMonthKey } from './dates/month-key.js';
import type { DonationSource, LedgerEntry } from './ledger.js';

/** Test fixtures only; excluded from coverage and never exported from the package. */
function must<T>(result: { ok: true; value: T } | { ok: false }, what: string): T {
  if (!result.ok) throw new Error(`bad fixture: ${what}`);
  return result.value;
}

export const d = (text: string): CivilDate => must(parseCivilDate(text), text);
export const mk = (text: string): MonthKey => must(parseMonthKey(text), text);
export const md = (text: string): MonthDay => must(parseMonthDay(text), text);
export const inst = (text: string): Instant => must(parseInstant(text), text);

export function entry(
  date: string,
  amountMinor: number,
  currency: string,
  countryCode: string,
  source: DonationSource = 'manual',
): LedgerEntry {
  return { date: d(date), money: { amountMinor, currency }, countryCode, source };
}
