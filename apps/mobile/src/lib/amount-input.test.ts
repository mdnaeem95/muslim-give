import { parseMajor } from '@muslim-give/domain';
import { currencyPrefix, sanitizeAmount } from './amount-input';

describe('currencyPrefix (spec 6.7)', () => {
  it('uses the prototype symbols', () => {
    expect(currencyPrefix('SGD')).toBe('S$');
    expect(currencyPrefix('MYR')).toBe('RM');
    expect(currencyPrefix('IDR')).toBe('Rp');
    expect(currencyPrefix('BND')).toBe('B$');
    expect(currencyPrefix('USD')).toBe('US$');
    expect(currencyPrefix('GBP')).toBe('£');
    expect(currencyPrefix('EUR')).toBe('€');
  });

  it('shows the ISO code for any other currency', () => {
    expect(currencyPrefix('SAR')).toBe('SAR');
    expect(currencyPrefix('KWD')).toBe('KWD');
  });
});

describe('R-MON-2 sanitizeAmount keeps the decimals the currency has', () => {
  it('allows two decimals for SGD and cuts the rest without rounding', () => {
    expect(sanitizeAmount('12.5', 'SGD')).toBe('12.5');
    expect(sanitizeAmount('12.50', 'SGD')).toBe('12.50');
    expect(sanitizeAmount('12.345', 'SGD')).toBe('12.34');
    expect(sanitizeAmount('12.999', 'SGD')).toBe('12.99');
  });

  it('allows three decimals for KWD and none for JPY', () => {
    expect(sanitizeAmount('1.2504', 'KWD')).toBe('1.250');
    expect(sanitizeAmount('1500.7', 'JPY')).toBe('1500');
    expect(sanitizeAmount('1500.', 'JPY')).toBe('1500');
  });

  it('keeps a trailing point so a person can go on typing decimals', () => {
    expect(sanitizeAmount('12.', 'SGD')).toBe('12.');
  });
});

describe('R-MON-3 sanitizeAmount accepts only a plain amount', () => {
  it('drops letters, signs, spaces and symbols', () => {
    expect(sanitizeAmount('S$ 1a2-3', 'SGD')).toBe('123');
    expect(sanitizeAmount('', 'SGD')).toBe('');
    expect(sanitizeAmount('abc', 'SGD')).toBe('');
  });

  it('keeps only the first decimal point', () => {
    expect(sanitizeAmount('1.2.3', 'SGD')).toBe('1.23');
    expect(sanitizeAmount('1..5', 'SGD')).toBe('1.5');
  });

  it('turns a comma or Arabic decimal mark into a point', () => {
    expect(sanitizeAmount('1,5', 'SGD')).toBe('1.5');
    expect(sanitizeAmount('1٫5', 'SGD')).toBe('1.5');
  });

  it('turns Arabic-Indic and Persian digits into 0-9', () => {
    expect(sanitizeAmount('١٢٫٥', 'SGD')).toBe('12.5');
    expect(sanitizeAmount('۱۲۳', 'SGD')).toBe('123');
  });

  it('removes leading zeros but keeps a single zero', () => {
    expect(sanitizeAmount('007', 'SGD')).toBe('7');
    expect(sanitizeAmount('0', 'SGD')).toBe('0');
    expect(sanitizeAmount('00', 'SGD')).toBe('0');
    expect(sanitizeAmount('0.5', 'SGD')).toBe('0.5');
    expect(sanitizeAmount('00.5', 'SGD')).toBe('0.5');
  });

  it('writes a bare point as 0.', () => {
    expect(sanitizeAmount('.', 'SGD')).toBe('0.');
    expect(sanitizeAmount('.5', 'SGD')).toBe('0.5');
    expect(sanitizeAmount('.', 'JPY')).toBe('');
  });

  it('stops at 11 whole digits so the amount stays a safe integer', () => {
    expect(sanitizeAmount('123456789012345', 'SGD')).toBe('12345678901');
    expect(sanitizeAmount('99999999999.99', 'KWD')).toBe('99999999999.99');
  });

  it('gives text the domain parser accepts', () => {
    for (const [typed, currency] of [
      ['12.50', 'SGD'],
      ['1,5', 'SGD'],
      ['١٢', 'SGD'],
      ['1.2504', 'KWD'],
      ['1500.7', 'JPY'],
      ['.5', 'SGD'],
    ] as const) {
      expect(parseMajor(sanitizeAmount(typed, currency), currency).ok).toBe(true);
    }
  });
});
