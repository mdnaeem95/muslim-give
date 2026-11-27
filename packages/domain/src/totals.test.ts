import { entry, mk } from './test-support.js';
import { isEidEntry, type HomeContext } from './ledger.js';
import {
  countEntries,
  homeTotalMinor,
  isHomeEntry,
  isOverseas,
  monthlyBudgetSpendMinor,
  sumMinor,
  totalsByCurrency,
} from './totals.js';

const home: HomeContext = { homeCountry: 'SG', homeCurrency: 'SGD' };
const e1 = entry('2027-03-05', 1000, 'SGD', 'SG');
const e2 = entry('2027-03-20', 500, 'SGD', 'SG', 'eid_person');
const e3 = entry('2027-03-21', 2000, 'MYR', 'MY');
const e4 = entry('2027-04-01', 700, 'SGD', 'MY');
const e5 = entry('2026-12-31', 300, 'SGD', 'SG', 'recurring');
const all = [e1, e2, e3, e4, e5];

describe('R-TOT-01 home and per-currency totals', () => {
  it('treats an entry as home when its currency is the home currency', () => {
    expect(isHomeEntry(e1, home)).toBe(true);
    expect(isHomeEntry(e3, home)).toBe(false);
  });
  it('adds only home entries into the home total', () => {
    expect(homeTotalMinor(all, home)).toBe(2500);
  });
  it('totals every currency separately, never converted, sorted by code', () => {
    expect(totalsByCurrency(all)).toEqual([
      { currency: 'MYR', amountMinor: 2000 },
      { currency: 'SGD', amountMinor: 2500 },
    ]);
    expect(totalsByCurrency([])).toEqual([]);
    expect(sumMinor([])).toBe(0);
  });
});

describe('R-TOT-02 overseas is computed', () => {
  it('compares the gift country with the current home country', () => {
    expect(isOverseas(e1, home)).toBe(false);
    expect(isOverseas(e4, home)).toBe(true);
    expect(isOverseas(e3, home)).toBe(true);
  });
  it('changes with the home country without rewriting entries', () => {
    expect(isOverseas(e4, { homeCountry: 'MY', homeCurrency: 'MYR' })).toBe(false);
    expect(isOverseas(e1, { homeCountry: 'MY', homeCurrency: 'MYR' })).toBe(true);
  });
});

describe('R-TOT-03 monthly budget spend', () => {
  it('counts home entries in the month and excludes Eid Planner entries', () => {
    expect(monthlyBudgetSpendMinor(all, home, mk('2027-03'))).toBe(1000);
    expect(monthlyBudgetSpendMinor(all, home, mk('2027-04'))).toBe(700);
    expect(monthlyBudgetSpendMinor(all, home, mk('2026-12'))).toBe(300);
    expect(monthlyBudgetSpendMinor(all, home, mk('2027-05'))).toBe(0);
  });
  it('still counts Eid entries in year totals', () => {
    expect(isEidEntry(e2)).toBe(true);
    expect(isEidEntry(entry('2027-03-20', 1, 'SGD', 'SG', 'eid_packet'))).toBe(true);
    expect(isEidEntry(e1)).toBe(false);
    expect(homeTotalMinor([e1, e2], home)).toBe(1500);
  });
});

describe('R-TOT-04 counts include every currency', () => {
  it('counts all entries, optionally for one year', () => {
    expect(countEntries(all)).toBe(5);
    expect(countEntries(all, 2027)).toBe(4);
    expect(countEntries(all, 2026)).toBe(1);
    expect(countEntries(all, 202)).toBe(0);
  });
});
