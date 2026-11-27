import { err, ok, type AppError, type Result } from '../result.js';

/**
 * Rule R-DATE-1: a civil date is the `YYYY-MM-DD` the person means, in their own time zone,
 * never converted between zones (spec 7.2). No `Date` is exposed outside this file.
 */
export type CivilDate = string & { readonly __brand: 'CivilDate' };
/** `YYYY-MM` (spec 7.2). */
export type MonthKey = string & { readonly __brand: 'MonthKey' };
/** `MM-DD` yearly anchor (spec 7.2). */
export type MonthDay = string & { readonly __brand: 'MonthDay' };

export interface DateError extends AppError {
  readonly code: 'date.invalid';
}
const invalid = (): Result<never, DateError> => err({ code: 'date.invalid' });

const CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY = /^(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Validate and brand a `YYYY-MM-DD` string; rejects 2026-02-30 and the like. */
export function parseCivilDate(text: string): Result<CivilDate, DateError> {
  const match = CIVIL.exec(text);
  if (!match) return invalid();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return invalid();
  }
  return ok(text as CivilDate);
}

/** Unchecked constructor: callers guarantee a real date (validated parts or table output). */
export function makeCivilDate(year: number, month: number, day: number): CivilDate {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as CivilDate;
}

function split(date: CivilDate): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Whole days since 1970-01-01 (UTC arithmetic only; no time zones involved). */
export function toEpochDay(date: CivilDate): number {
  const { year, month, day } = split(date);
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return Math.round(d.getTime() / MS_PER_DAY);
}

export function fromEpochDay(epochDay: number): CivilDate {
  const d = new Date(epochDay * MS_PER_DAY);
  return makeCivilDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromEpochDay(toEpochDay(date) + days);
}

export function daysBetween(from: CivilDate, to: CivilDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function monthKeyOf(date: CivilDate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

/** Calendar-day-of-week, 0 = Sunday .. 6 = Saturday (Friday = 5). */
export function weekdayOf(date: CivilDate): number {
  return (((toEpochDay(date) + 4) % 7) + 7) % 7;
}

export function parseMonthDay(text: string): Result<MonthDay, DateError> {
  const match = MONTH_DAY.exec(text);
  if (!match) return invalid();
  const month = Number(match[1]);
  const day = Number(match[2]);
  // Validate against a leap year so 02-29 is accepted as an anchor.
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(2024, month)) return invalid();
  return ok(text as MonthDay);
}

/** Rule R-DATE-2: a `02-29` anchor falls on 02-28 in non-leap years (spec 7.2). */
export function monthDayInYear(monthDay: MonthDay, year: number): CivilDate {
  const month = Number(monthDay.slice(0, 2));
  const day = Number(monthDay.slice(3, 5));
  return makeCivilDate(year, month, Math.min(day, daysInMonth(year, month)));
}
