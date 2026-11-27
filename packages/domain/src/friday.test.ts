import { d, entry } from './test-support.js';
import { fridayRepeatCandidate, isFriday, isFridayCardVisible } from './friday.js';
import type { HomeContext, LedgerEntry } from './ledger.js';

const home: HomeContext = { homeCountry: 'SG', homeCurrency: 'SGD' };
const friday = d('2026-11-27');

describe('R-FRI-02 card visibility', () => {
  const base = { today: friday, enabled: true, dismissedDate: null, hasEntryDatedToday: false };
  it('knows Fridays', () => {
    expect(isFriday(friday)).toBe(true);
    expect(isFriday(d('2026-11-28'))).toBe(false);
  });
  it('shows on Fridays when enabled', () => {
    expect(isFridayCardVisible(base)).toBe(true);
  });
  it('stays hidden when off, on other days, once dismissed today, or after an entry today', () => {
    expect(isFridayCardVisible({ ...base, enabled: false })).toBe(false);
    expect(isFridayCardVisible({ ...base, today: d('2026-11-28') })).toBe(false);
    expect(isFridayCardVisible({ ...base, dismissedDate: friday })).toBe(false);
    expect(isFridayCardVisible({ ...base, hasEntryDatedToday: true })).toBe(false);
  });
  it('shows again when the dismissal was on an earlier Friday', () => {
    expect(isFridayCardVisible({ ...base, dismissedDate: d('2026-11-20') })).toBe(true);
  });
});

describe('R-FRI-03 repeat the last Friday gift', () => {
  type Tagged = LedgerEntry & { readonly tag: string };
  const tag = (tagName: string, e: LedgerEntry): Tagged => ({ ...e, tag: tagName });

  it('picks the most recent qualifying Friday gift', () => {
    const list = [
      tag('nov27', entry('2026-11-27', 500, 'SGD', 'SG')),
      tag('nov20', entry('2026-11-20', 300, 'SGD', 'SG')),
    ];
    expect(fridayRepeatCandidate(list, home)?.tag).toBe('nov27');
  });
  it('prefers the later one in the list when dates tie', () => {
    const list = [
      tag('first', entry('2026-11-27', 500, 'SGD', 'SG')),
      tag('second', entry('2026-11-27', 600, 'SGD', 'SG')),
    ];
    expect(fridayRepeatCandidate(list, home)?.tag).toBe('second');
  });
  it('ignores non-Friday, other-currency, overseas and Eid Planner gifts', () => {
    const list = [
      tag('saturday', entry('2026-11-28', 100, 'SGD', 'SG')),
      tag('myr', entry('2026-11-27', 100, 'MYR', 'SG')),
      tag('overseas', entry('2026-11-27', 100, 'SGD', 'MY')),
      tag('eid', entry('2026-11-27', 100, 'SGD', 'SG', 'eid_person')),
      tag('ok', entry('2026-11-13', 100, 'SGD', 'SG')),
    ];
    expect(fridayRepeatCandidate(list, home)?.tag).toBe('ok');
  });
  it('returns null when nothing qualifies', () => {
    expect(fridayRepeatCandidate([], home)).toBe(null);
    expect(fridayRepeatCandidate([entry('2026-11-28', 1, 'SGD', 'SG')], home)).toBe(null);
  });
});
