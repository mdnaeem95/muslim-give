import { exponentOf } from '@muslim-give/domain';

/** Whole-number digits kept, so that digits plus decimals always fit a safe integer (R-MON-1). */
const MAX_WHOLE_DIGITS = 11;

/** The prototype's symbol map (spec 6.7). Any other currency shows its ISO code. */
const SYMBOLS: Readonly<Record<string, string>> = {
  SGD: 'S$',
  MYR: 'RM',
  IDR: 'Rp',
  BND: 'B$',
  USD: 'US$',
  GBP: '£',
  EUR: '€',
};

/** What sits in front of the amount: "S$" for SGD, "SAR" for SAR (spec 6.7). */
export function currencyPrefix(currency: string): string {
  return SYMBOLS[currency] ?? currency;
}

/** Arabic-Indic and Persian digits become 0-9, and "," and the Arabic decimal mark become ".". */
function toPlainNumber(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[,٫]/g, '.');
}

/**
 * Keeps what a person types in an amount box valid as they type (R-MON-2, R-MON-3): digits and
 * one decimal point, no more decimals than the currency has, no leading zeros, and nothing else.
 * It never rounds. A currency with no decimals (JPY) drops the point.
 * Examples: "12.345" in SGD is "12.34", "007" is "7", ".5" is "0.5", "1,5" is "1.5".
 */
export function sanitizeAmount(text: string, currency: string): string {
  const exponent = exponentOf(currency);
  const cleaned = toPlainNumber(text).replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  const wholeText = dot < 0 ? cleaned : cleaned.slice(0, dot);
  const whole = wholeText.replace(/^0+(?=\d)/, '').slice(0, MAX_WHOLE_DIGITS);
  if (exponent === 0 || dot < 0) return whole;
  const fraction = cleaned
    .slice(dot + 1)
    .replace(/\./g, '')
    .slice(0, exponent);
  return `${whole === '' ? '0' : whole}.${fraction}`;
}
