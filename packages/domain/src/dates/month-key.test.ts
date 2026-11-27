import { d, mk } from '../test-support.js';
import {
  addMonths,
  dueDateIn,
  lastDayOfMonth,
  monthsInclusive,
  parseMonthKey,
} from './month-key.js';

describe('month keys', () => {
  it('parses YYYY-MM and rejects everything else', () => {
    expect(parseMonthKey('2027-04')).toEqual({ ok: true, value: '2027-04' });
    for (const bad of ['2027-4', '2027-13', '2027-00', '0000-05', '', 'abc']) {
      expect(parseMonthKey(bad)).toEqual({ ok: false, error: { code: 'date.invalid' } });
    }
  });
  it('adds months across year boundaries, forwards and backwards', () => {
    expect(addMonths(mk('2027-11'), 3)).toBe('2028-02');
    expect(addMonths(mk('2027-01'), -1)).toBe('2026-12');
    expect(addMonths(mk('2027-01'), 0)).toBe('2027-01');
    expect(addMonths(mk('2027-01'), -13)).toBe('2025-12');
  });
  it('knows the last day of a month', () => {
    expect(lastDayOfMonth(mk('2028-02'))).toBe(29);
    expect(lastDayOfMonth(mk('2027-02'))).toBe(28);
    expect(lastDayOfMonth(mk('2027-04'))).toBe(30);
  });
  it('R-REC-02 clamps the due day to the last day of the month', () => {
    expect(dueDateIn(mk('2027-04'), 31)).toBe('2027-04-30');
    expect(dueDateIn(mk('2027-04'), 15)).toBe('2027-04-15');
    expect(dueDateIn(mk('2027-02'), 30)).toBe(d('2027-02-28'));
    expect(dueDateIn(mk('2028-02'), 30)).toBe('2028-02-29');
  });
  it('lists months inclusively', () => {
    expect(monthsInclusive(mk('2027-11'), mk('2028-02'))).toEqual([
      '2027-11',
      '2027-12',
      '2028-01',
      '2028-02',
    ]);
    expect(monthsInclusive(mk('2027-05'), mk('2027-05'))).toEqual(['2027-05']);
    expect(monthsInclusive(mk('2027-06'), mk('2027-05'))).toEqual([]);
  });
});
