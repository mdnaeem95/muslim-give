import {
  parseCivilDate,
  parseInstant,
  parseMonthDay,
  parseMonthKey,
  type CivilDate,
  type Instant,
  type MonthDay,
  type MonthKey,
} from '@muslim-give/domain';
import { z } from 'zod';
import { LIMITS } from './limits.js';

/**
 * Error messages throughout this package are stable codes (e.g. `money.not_positive`), never
 * display text. The app maps them to plain-language copy through i18n (spec 6.3).
 */
export const civilDateSchema = z
  .string()
  .refine((value): value is CivilDate => parseCivilDate(value).ok, 'date.invalid');

export const monthKeySchema = z
  .string()
  .refine((value): value is MonthKey => parseMonthKey(value).ok, 'date.invalid');

export const monthDaySchema = z
  .string()
  .refine((value): value is MonthDay => parseMonthDay(value).ok, 'date.invalid');

export const instantSchema = z
  .string()
  .refine((value): value is Instant => parseInstant(value).ok, 'date.invalid');

/** Spec 7.1: integer minor units, always positive for a donation. */
export const positiveAmountMinorSchema = z
  .number()
  .int('money.invalid_amount')
  .positive('money.not_positive')
  .max(Number.MAX_SAFE_INTEGER, 'money.invalid_amount');

/** Budgets and plan amounts may be zero (no budget). */
export const nonNegativeAmountMinorSchema = z
  .number()
  .int('money.invalid_amount')
  .nonnegative('money.invalid_amount')
  .max(Number.MAX_SAFE_INTEGER, 'money.invalid_amount');

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'money.invalid_currency');

export const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/, 'country.invalid');

/** UUIDv7s, deterministic IDs such as `occ_<ruleId>_<YYYY-MM>`, and reference IDs. */
export const idSchema = z
  .string()
  .min(1, 'id.invalid')
  .max(LIMITS.idMax, 'id.invalid')
  .regex(/^[A-Za-z0-9_-]+$/, 'id.invalid');

/** Trimmed, non-empty text with a maximum length. Empty means "absent", which is `null`. */
export const boundedText = (max: number, tooLong: string) =>
  z.string().trim().min(1, 'text.empty').max(max, tooLong);
