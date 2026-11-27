import { fromEpochDay, toEpochDay, type CivilDate } from '../dates/civil-date.js';
import { UMALQURA_FIRST_EPOCH_DAY, UMALQURA_MONTH_LENGTHS } from './umalqura-data.js';
import { fromHijri, toHijri } from './hijri.js';

/**
 * R-HIJ-06 oracle: every day in 1356-1500 AH must match Node's full-ICU `islamic-umalqura`.
 * A mismatch fails the build. If ICU data changes, regenerate with
 * `node scripts/generate-umalqura.mjs` and review the diff.
 */
const MS_PER_DAY = 86_400_000;
const icu = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

function icuHijri(epochDay: number): { year: number; month: number; day: number } {
  const parts = icu.formatToParts(new Date(epochDay * MS_PER_DAY));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

type Parts = { year: number; month: number; day: number } | null;
const key = (h: Parts): string => (h === null ? 'none' : [h.year, h.month, h.day].join('-'));

describe('R-HIJ-06 ICU oracle', () => {
  it('matches ICU on every day of the table and round-trips', () => {
    expect(icu.resolvedOptions().calendar).toBe('islamic-umalqura');
    let totalDays = 0;
    for (const ch of UMALQURA_MONTH_LENGTHS) totalDays += ch === '1' ? 30 : 29;

    const mismatches: string[] = [];
    for (let i = 0; i < totalDays; i += 1) {
      const epochDay = UMALQURA_FIRST_EPOCH_DAY + i;
      const date: CivilDate = fromEpochDay(epochDay);
      const ours = toHijri(date);
      const theirs = icuHijri(epochDay);
      const roundTrip = ours === null ? null : fromHijri(ours);
      if (key(ours) !== key(theirs) || roundTrip !== date || toEpochDay(date) !== epochDay) {
        mismatches.push(`${date}: ours=${JSON.stringify(ours)} icu=${JSON.stringify(theirs)}`);
        if (mismatches.length >= 10) break;
      }
    }
    expect(mismatches).toEqual([]);
  });
});
