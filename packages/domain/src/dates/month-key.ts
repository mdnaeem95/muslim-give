import { err, ok, type Result } from '../result.js';
import {
  daysInMonth,
  makeCivilDate,
  type CivilDate,
  type DateError,
  type MonthKey,
} from './civil-date.js';

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const MONTHS_PER_YEAR = 12;

function split(month: MonthKey): { year: number; month: number } {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

function makeMonthKey(year: number, month: number): MonthKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as MonthKey;
}

/** Validate and brand a `YYYY-MM` string. */
export function parseMonthKey(text: string): Result<MonthKey, DateError> {
  const match = MONTH_KEY.exec(text);
  if (!match) return err({ code: 'date.invalid' });
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || month < 1 || month > MONTHS_PER_YEAR) return err({ code: 'date.invalid' });
  return ok(text as MonthKey);
}

/** Month arithmetic across year boundaries, forwards or backwards. */
export function addMonths(month: MonthKey, delta: number): MonthKey {
  const parts = split(month);
  const index = parts.year * MONTHS_PER_YEAR + (parts.month - 1) + delta;
  const year = Math.floor(index / MONTHS_PER_YEAR);
  return makeMonthKey(year, index - year * MONTHS_PER_YEAR + 1);
}

export function lastDayOfMonth(month: MonthKey): number {
  const parts = split(month);
  return daysInMonth(parts.year, parts.month);
}

/**
 * Rule R-REC-02: due date for a month is the day of month, clamped to the month's last day
 * (31 becomes 30 April, and 28 or 29 February).
 */
export function dueDateIn(month: MonthKey, dayOfMonth: number): CivilDate {
  const parts = split(month);
  return makeCivilDate(parts.year, parts.month, Math.min(dayOfMonth, lastDayOfMonth(month)));
}

/** Every month from `from` to `to`, both included; empty when `from` is after `to`. */
export function monthsInclusive(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  for (let current = from; current <= to; current = addMonths(current, 1)) months.push(current);
  return months;
}
