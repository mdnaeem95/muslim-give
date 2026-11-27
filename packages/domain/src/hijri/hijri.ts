import { fromEpochDay, toEpochDay, type CivilDate } from '../dates/civil-date.js';
import {
  UMALQURA_FIRST_EPOCH_DAY,
  UMALQURA_FIRST_YEAR,
  UMALQURA_LAST_YEAR,
  UMALQURA_MONTH_LENGTHS,
} from './umalqura-data.js';

/**
 * Rules R-HIJ-05/06 (spec 10.9, ADR-007): an in-house Umm al-Qura table gives identical
 * results on every phone, instead of relying on each platform's `Intl`.
 */
export interface HijriDate {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..30
}

/** The user's Profile adjustment in days (spec 10.9). +1 means the Hijri date is one day later. */
export type HijriAdjustment = -1 | 0 | 1;

/** R-HIJ-05: display names, index 0 = month 1. */
export const HIJRI_MONTH_NAMES = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jamadilawal',
  'Jamadilakhir',
  'Rejab',
  'Syaaban',
  'Ramadan',
  'Syawal',
  'Zulkaedah',
  'Zulhijjah',
] as const;

const MONTHS_PER_YEAR = 12;

/** Epoch day of the first day of each month, plus one final entry for the end of the table. */
const MONTH_STARTS: readonly number[] = (() => {
  const starts = [UMALQURA_FIRST_EPOCH_DAY];
  let current = UMALQURA_FIRST_EPOCH_DAY;
  for (let i = 0; i < UMALQURA_MONTH_LENGTHS.length; i += 1) {
    current += UMALQURA_MONTH_LENGTHS.charAt(i) === '1' ? 30 : 29;
    starts.push(current);
  }
  return starts;
})();

const TABLE_MONTHS = MONTH_STARTS.length - 1;

/** Callers bound the index to the table, so the guard below is unreachable by construction. */
function startOf(monthIndex: number): number {
  const value = MONTH_STARTS[monthIndex];
  /* istanbul ignore if -- unreachable: keeps the type honest without a `!` assertion */
  if (value === undefined) throw new RangeError(`Hijri month index out of range: ${monthIndex}`);
  return value;
}

function monthIndexOf(year: number, month: number): number | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < UMALQURA_FIRST_YEAR ||
    year > UMALQURA_LAST_YEAR ||
    month < 1 ||
    month > MONTHS_PER_YEAR
  ) {
    return null;
  }
  return (year - UMALQURA_FIRST_YEAR) * MONTHS_PER_YEAR + (month - 1);
}

/** Length of a Hijri month (29 or 30), or null outside 1356-1500 AH. */
export function hijriMonthLength(year: number, month: number): number | null {
  const index = monthIndexOf(year, month);
  return index === null ? null : startOf(index + 1) - startOf(index);
}

/**
 * Hijri date for a civil date, or null outside the table so the app shows no Hijri date
 * rather than a wrong one (R-HIJ-06). The adjustment looks up the civil date shifted by
 * that many days, as the prototype does.
 */
export function toHijri(date: CivilDate, adjustment: HijriAdjustment = 0): HijriDate | null {
  const epochDay = toEpochDay(date) + adjustment;
  if (epochDay < startOf(0) || epochDay >= startOf(TABLE_MONTHS)) return null;
  let low = 0;
  let high = TABLE_MONTHS - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (startOf(mid) <= epochDay) low = mid;
    else high = mid - 1;
  }
  return {
    year: UMALQURA_FIRST_YEAR + Math.floor(low / MONTHS_PER_YEAR),
    month: (low % MONTHS_PER_YEAR) + 1,
    day: epochDay - startOf(low) + 1,
  };
}

/** Civil date (unadjusted) for a Hijri date, or null if it is not in the table or not a real day. */
export function fromHijri(hijri: HijriDate): CivilDate | null {
  const index = monthIndexOf(hijri.year, hijri.month);
  if (index === null) return null;
  const length = startOf(index + 1) - startOf(index);
  if (!Number.isInteger(hijri.day) || hijri.day < 1 || hijri.day > length) return null;
  return fromEpochDay(startOf(index) + hijri.day - 1);
}

export interface HijriEvent {
  readonly code: string;
  readonly name: string;
  readonly month: number;
  readonly day: number;
  /** True when the home country's authority announces it (shown "expected" until then). */
  readonly officiallyAnnounced: boolean;
}

/** R-HIJ-02: the special days. `code` doubles as the occasion preset. */
export const HIJRI_EVENTS: readonly HijriEvent[] = [
  { code: 'awal_muharram', name: 'Awal Muharram', month: 1, day: 1, officiallyAnnounced: false },
  { code: 'ashura', name: 'Ashura', month: 1, day: 10, officiallyAnnounced: false },
  { code: 'mawlid_nabi', name: 'Mawlid Nabi', month: 3, day: 12, officiallyAnnounced: false },
  { code: 'isra_miraj', name: "Isra' Mi'raj", month: 7, day: 27, officiallyAnnounced: false },
  { code: 'nisfu_syaban', name: "Nisfu Sya'ban", month: 8, day: 15, officiallyAnnounced: false },
  { code: 'ramadan', name: 'First day of Ramadan', month: 9, day: 1, officiallyAnnounced: true },
  { code: 'eid_al_fitr', name: 'Eid al-Fitr', month: 10, day: 1, officiallyAnnounced: true },
  { code: 'day_of_arafah', name: 'Day of Arafah', month: 12, day: 9, officiallyAnnounced: true },
  { code: 'eid_al_adha', name: 'Eid al-Adha', month: 12, day: 10, officiallyAnnounced: true },
];

export function hijriEventOn(hijri: HijriDate): HijriEvent | null {
  return HIJRI_EVENTS.find((e) => e.month === hijri.month && e.day === hijri.day) ?? null;
}

export interface UpcomingEvent {
  readonly event: HijriEvent;
  readonly inDays: number;
}

/** R-HIJ-04: the nearest event 1-14 days ahead of `today`, or null. */
export function upcomingEvent(
  today: CivilDate,
  adjustment: HijriAdjustment = 0,
): UpcomingEvent | null {
  const start = toEpochDay(today);
  for (let inDays = 1; inDays <= 14; inDays += 1) {
    const hijri = toHijri(fromEpochDay(start + inDays), adjustment);
    const event = hijri === null ? null : hijriEventOn(hijri);
    if (event !== null) return { event, inDays };
  }
  return null;
}
