import { monthKeyOf, type MonthKey } from './dates/civil-date.js';
import { isEidEntry, type HomeContext, type LedgerEntry } from './ledger.js';

/** R-TOT-01: an entry is home when its currency is the profile's home currency. */
export function isHomeEntry(entry: LedgerEntry, home: HomeContext): boolean {
  return entry.money.currency === home.homeCurrency;
}

/** R-TOT-02: overseas is computed from the current home country, never stored. */
export function isOverseas(entry: LedgerEntry, home: HomeContext): boolean {
  return entry.countryCode !== home.homeCountry;
}

/** Sum of minor units. Amounts are bounded by the sanity check, so sums stay far below 2^53. */
export function sumMinor(entries: readonly LedgerEntry[]): number {
  return entries.reduce((total, entry) => total + entry.money.amountMinor, 0);
}

/** Home-currency total of the given entries (money totals and charts, R-TOT-01). */
export function homeTotalMinor(entries: readonly LedgerEntry[], home: HomeContext): number {
  return sumMinor(entries.filter((entry) => isHomeEntry(entry, home)));
}

export interface CurrencyTotal {
  readonly currency: string;
  readonly amountMinor: number;
}

/** Totals per currency, never converted (R-TOT-01); sorted by currency code. */
export function sumByCurrency(items: readonly CurrencyTotal[]): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const { currency, amountMinor } of items) {
    totals.set(currency, (totals.get(currency) ?? 0) + amountMinor);
  }
  return [...totals]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** R-TOT-01: every currency in the entries totalled separately. */
export function totalsByCurrency(entries: readonly LedgerEntry[]): CurrencyTotal[] {
  return sumByCurrency(entries.map((entry) => entry.money));
}

/**
 * R-TOT-03: monthly budget spend is home entries in that calendar month, excluding Eid Planner
 * entries (those count against the Eid budget only, but stay in year and all-time totals).
 */
export function monthlyBudgetSpendMinor(
  entries: readonly LedgerEntry[],
  home: HomeContext,
  month: MonthKey,
): number {
  return sumMinor(
    entries.filter(
      (entry) => isHomeEntry(entry, home) && !isEidEntry(entry) && monthKeyOf(entry.date) === month,
    ),
  );
}

/** R-TOT-04: counts include entries in every currency, overseas ones too (the default). */
export function countEntries(entries: readonly LedgerEntry[], year?: number): number {
  if (year === undefined) return entries.length;
  return entries.filter((entry) => entry.date.startsWith(`${String(year)}-`)).length;
}
