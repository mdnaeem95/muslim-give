import { makeCivilDate } from '@muslim-give/domain';
import { formatCivilDate, formatHijriDate } from './format.js';

describe('formatCivilDate (spec 6.7)', () => {
  it('writes day, short month and year', () => {
    expect(formatCivilDate(makeCivilDate(2027, 3, 5))).toBe('5 Mar 2027');
    expect(formatCivilDate(makeCivilDate(2026, 11, 27))).toBe('27 Nov 2026');
    expect(formatCivilDate(makeCivilDate(2027, 1, 1))).toBe('1 Jan 2027');
    expect(formatCivilDate(makeCivilDate(2027, 12, 31))).toBe('31 Dec 2027');
  });
  it('names every month', () => {
    const names = Array.from(
      { length: 12 },
      (_, index) => formatCivilDate(makeCivilDate(2027, index + 1, 15)).split(' ')[1],
    );
    expect(names).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
  });
});

describe('formatHijriDate (R-HIJ-05)', () => {
  it('uses the Malay month names', () => {
    expect(formatHijriDate({ year: 1448, month: 8, day: 25 })).toBe('25 Syaaban 1448 AH');
    expect(formatHijriDate({ year: 1447, month: 1, day: 1 })).toBe('1 Muharram 1447 AH');
    expect(formatHijriDate({ year: 1447, month: 9, day: 1 })).toBe('1 Ramadan 1447 AH');
  });
  it('shows no month name rather than a wrong one for an impossible month', () => {
    expect(formatHijriDate({ year: 1447, month: 13, day: 1 })).toBe('1  1447 AH');
  });
});
