import type { DonationSource } from './codes.js';
import type { CivilDate } from './dates/civil-date.js';
import type { Money } from './money/money.js';

/** The facts the rules need from a live (not deleted) donation. */
export interface LedgerEntry {
  readonly date: CivilDate;
  readonly money: Money;
  /** ISO 3166-1 alpha-2 country where the gift was made (spec 7.5). */
  readonly countryCode: string;
  readonly source: DonationSource;
}

/** The person's current home (spec 7.5 profile). */
export interface HomeContext {
  readonly homeCountry: string;
  readonly homeCurrency: string;
}

/** Eid Planner entries count against the Eid budget only (R-TOT-03). */
export function isEidEntry(entry: LedgerEntry): boolean {
  return entry.source === 'eid_person' || entry.source === 'eid_packet';
}
