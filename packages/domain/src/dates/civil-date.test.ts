import {
  addDays,
  daysBetween,
  daysInMonth,
  fromEpochDay,
  isLeapYear,
  monthDayInYear,
  monthKeyOf,
  parseCivilDate,
  parseMonthDay,
  toEpochDay,
  weekdayOf,
  type CivilDate,
  type MonthDay,
} from './civil-date.js';

const d = (s: string): CivilDate => {
  const r = parseCivilDate(s);
  if (!r.ok) throw new Error(`bad fixture ${s}`);
  return r.value;
};

describe('R-DATE-1 civil dates', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(parseCivilDate('2026-11-27').ok).toBe(true);
    expect(parseCivilDate('2024-02-29').ok).toBe(true);
    for (const bad of [
      '2026-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '2026-1-1',
      '',
      '0000-01-01',
      '2026-01-00',
    ]) {
      expect(parseCivilDate(bad)).toEqual({ ok: false, error: { code: 'date.invalid' } });
    }
  });
  it('knows month lengths and leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
  });
  it('does arithmetic across month, year and leap boundaries', () => {
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
    expect(daysBetween(d('2026-11-27'), d('2026-12-27'))).toBe(30);
    expect(fromEpochDay(toEpochDay(d('2026-11-27')))).toBe('2026-11-27');
    expect(toEpochDay(d('1970-01-01'))).toBe(0);
  });
  it('derives month keys and weekdays', () => {
    expect(monthKeyOf(d('2026-11-27'))).toBe('2026-11');
    expect(weekdayOf(d('2026-11-27'))).toBe(5); // Friday
    expect(weekdayOf(d('1969-12-31'))).toBe(3); // Wednesday, before the epoch
    expect(weekdayOf(d('1970-01-01'))).toBe(4); // Thursday
  });
});

describe('R-DATE-2 month-day anchors', () => {
  it('accepts valid anchors including 02-29', () => {
    expect(parseMonthDay('02-29').ok).toBe(true);
    for (const bad of ['13-01', '00-10', '04-31', '02-30', '1-1', '']) {
      expect(parseMonthDay(bad)).toEqual({ ok: false, error: { code: 'date.invalid' } });
    }
  });
  it('falls back to 02-28 in non-leap years', () => {
    const anchor = '02-29' as MonthDay;
    expect(monthDayInYear(anchor, 2026)).toBe('2026-02-28');
    expect(monthDayInYear(anchor, 2028)).toBe('2028-02-29');
    expect(monthDayInYear('12-25' as MonthDay, 2026)).toBe('2026-12-25');
  });
});
