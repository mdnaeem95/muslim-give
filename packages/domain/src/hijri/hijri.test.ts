import { addDays, parseCivilDate, type CivilDate } from '../dates/civil-date.js';
import {
  HIJRI_EVENTS,
  HIJRI_MONTH_NAMES,
  fromHijri,
  hijriEventOn,
  hijriMonthLength,
  toHijri,
  upcomingEvent,
} from './hijri.js';

const d = (s: string): CivilDate => {
  const r = parseCivilDate(s);
  if (!r.ok) throw new Error(`bad fixture ${s}`);
  return r.value;
};

describe('R-HIJ-06 table range and conversion', () => {
  it('starts at 1 Muharram 1356 and ends at 30 Zulhijjah 1500', () => {
    expect(toHijri(d('1937-03-14'))).toEqual({ year: 1356, month: 1, day: 1 });
    expect(toHijri(d('1937-03-13'))).toBe(null);
    expect(toHijri(d('2077-11-16'))).toEqual({ year: 1500, month: 12, day: 30 });
    expect(toHijri(d('2077-11-17'))).toBe(null);
  });
  it('converts known dates (values cross-checked against ICU)', () => {
    expect(toHijri(d('2026-11-27'))).toEqual({ year: 1448, month: 6, day: 17 });
    expect(toHijri(d('2027-02-08'))).toEqual({ year: 1448, month: 9, day: 1 });
    expect(toHijri(d('2027-05-16'))).toEqual({ year: 1448, month: 12, day: 10 });
  });
  it('round-trips through fromHijri', () => {
    for (const s of ['1937-03-14', '2026-11-27', '2027-02-08', '2077-11-16']) {
      const h = toHijri(d(s));
      expect(h === null ? null : fromHijri(h)).toBe(s);
    }
  });
  it('rejects Hijri dates outside the table or not real days', () => {
    expect(fromHijri({ year: 1355, month: 12, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1501, month: 1, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1448, month: 0, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1448, month: 13, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1448.5, month: 1, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1448, month: 1.5, day: 1 })).toBe(null);
    expect(fromHijri({ year: 1448, month: 1, day: 0 })).toBe(null);
    expect(fromHijri({ year: 1448, month: 1, day: 1.5 })).toBe(null);
    const length = hijriMonthLength(1448, 1) ?? 0;
    expect(fromHijri({ year: 1448, month: 1, day: length })).not.toBe(null);
    expect(fromHijri({ year: 1448, month: 1, day: length + 1 })).toBe(null);
  });
  it('knows month lengths', () => {
    for (let month = 1; month <= 12; month += 1) {
      expect([29, 30]).toContain(hijriMonthLength(1448, month));
    }
    expect(hijriMonthLength(1355, 1)).toBe(null);
    expect(hijriMonthLength(1448, 13)).toBe(null);
  });
});

describe('R-HIJ-01 user adjustment', () => {
  it('looks up the civil date shifted by the adjustment', () => {
    const day = d('2026-11-27');
    expect(toHijri(day, 1)).toEqual(toHijri(addDays(day, 1)));
    expect(toHijri(day, -1)).toEqual(toHijri(addDays(day, -1)));
    expect(toHijri(day, 0)).toEqual(toHijri(day));
  });
  it('can push a date across the table edge in either direction', () => {
    expect(toHijri(d('1937-03-13'), 1)).toEqual({ year: 1356, month: 1, day: 1 });
    expect(toHijri(d('1937-03-14'), -1)).toBe(null);
  });
});

describe('R-HIJ-05 month names', () => {
  it('uses the approved spellings', () => {
    expect(HIJRI_MONTH_NAMES).toHaveLength(12);
    expect(HIJRI_MONTH_NAMES[0]).toBe('Muharram');
    expect(HIJRI_MONTH_NAMES[4]).toBe('Jamadilawal');
    expect(HIJRI_MONTH_NAMES[8]).toBe('Ramadan');
    expect(HIJRI_MONTH_NAMES[11]).toBe('Zulhijjah');
  });
});

describe('R-HIJ-02 events', () => {
  it('lists the nine special days', () => {
    expect(HIJRI_EVENTS).toHaveLength(9);
    expect(HIJRI_EVENTS.filter((e) => e.officiallyAnnounced).map((e) => e.code)).toEqual([
      'ramadan',
      'eid_al_fitr',
      'day_of_arafah',
      'eid_al_adha',
    ]);
  });
  it('finds the event on a Hijri date', () => {
    const h = toHijri(d('2027-05-16'));
    expect(h === null ? null : hijriEventOn(h)?.code).toBe('eid_al_adha');
    expect(hijriEventOn({ year: 1448, month: 6, day: 17 })).toBe(null);
  });
});

describe('R-HIJ-04 coming up', () => {
  it('finds the nearest event 1-14 days ahead', () => {
    const next = upcomingEvent(d('2027-02-01'));
    expect(next?.event.code).toBe('ramadan');
    expect(next?.inDays).toBe(7);
  });
  it('does not count today', () => {
    expect(upcomingEvent(d('2027-02-08'))?.event.code).not.toBe('ramadan');
  });
  it('returns null when nothing is within 14 days', () => {
    const quiet = fromHijri({ year: 1448, month: 12, day: 11 });
    expect(quiet === null ? 'fixture' : upcomingEvent(quiet)).toBe(null);
  });
  it('is quiet for dates before the table starts', () => {
    expect(upcomingEvent(d('1937-02-01'))).toBe(null);
  });
  it('honours the adjustment', () => {
    expect(upcomingEvent(d('2027-02-01'), 1)?.inDays).toBe(6);
  });
});
