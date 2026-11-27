import { DEFAULT_EXPONENT, NON_DEFAULT_EXPONENTS } from './iso4217.js';
import { err, ok, type AppError, type Result } from '../result.js';

/**
 * Rule R-MON-1: money is integer minor units plus an ISO 4217 code (spec 7.1, ADR-006).
 * Example: S$12.50 is { amountMinor: 1250, currency: 'SGD' }.
 */
export interface Money<C extends string = string> {
  readonly amountMinor: number;
  readonly currency: C;
}

export type MoneyErrorCode =
  | 'money.invalid_currency'
  | 'money.invalid_amount'
  | 'money.too_many_decimals'
  | 'money.not_positive'
  | 'money.too_large';

export interface MoneyError extends AppError {
  readonly code: MoneyErrorCode;
}

const fail = (code: MoneyErrorCode): Result<never, MoneyError> => err({ code });

const CURRENCY = /^[A-Z]{3}$/;
const MAJOR_AMOUNT = /^(\d+)(?:\.(\d+))?$/;

/** Decimal places for a currency (R-MON-2). */
export function exponentOf(currency: string): number {
  return NON_DEFAULT_EXPONENTS[currency] ?? DEFAULT_EXPONENT;
}

/** Build Money from minor units. Amounts must be positive safe integers (R-MON-1). */
export function fromMinor<C extends string>(
  amountMinor: number,
  currency: C,
): Result<Money<C>, MoneyError> {
  if (!CURRENCY.test(currency)) return fail('money.invalid_currency');
  if (!Number.isSafeInteger(amountMinor)) return fail('money.invalid_amount');
  if (amountMinor <= 0) return fail('money.not_positive');
  return ok({ amountMinor, currency });
}

/**
 * Parse what a person typed, e.g. "12.50" in SGD, without ever using floats (R-MON-3).
 * Rejects more decimals than the currency allows instead of rounding.
 */
export function parseMajor<C extends string>(
  text: string,
  currency: C,
): Result<Money<C>, MoneyError> {
  if (!CURRENCY.test(currency)) return fail('money.invalid_currency');
  const trimmed = text.trim();
  if (!MAJOR_AMOUNT.test(trimmed)) return fail('money.invalid_amount');
  const dot = trimmed.indexOf('.');
  const whole = dot < 0 ? trimmed : trimmed.slice(0, dot);
  const fraction = dot < 0 ? '' : trimmed.slice(dot + 1);
  const exponent = exponentOf(currency);
  if (fraction.length > exponent) return fail('money.too_many_decimals');
  const minor = Number(whole + fraction.padEnd(exponent, '0'));
  return fromMinor(minor, currency);
}

/** Sum of amounts in one currency; the type parameter prevents mixing (R-MON-4). */
export function sum<C extends string>(
  currency: C,
  items: readonly Money<C>[],
): Result<Money<C> | null, MoneyError> {
  let total = 0;
  for (const item of items) {
    if (item.currency !== currency) return fail('money.invalid_currency');
    total += item.amountMinor;
  }
  if (!Number.isSafeInteger(total)) return fail('money.too_large');
  return ok(total === 0 ? null : { amountMinor: total, currency });
}

/** R-MON-5: above 1,000,000 major units, ask "Is this amount right?" before saving. */
export function needsSanityConfirmation(money: Money): boolean {
  return money.amountMinor > 1_000_000 * 10 ** exponentOf(money.currency);
}
