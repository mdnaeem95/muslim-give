import { exponentOf } from '../money/money.js';
import {
  COMMON_COUNTRY_CODES,
  COUNTRIES,
  countryListSections,
  currencyName,
  findCountry,
  foldForSearch,
  searchCountries,
} from './countries.js';
import { CURRENCY_NAMES } from './currency-names.js';

const names = (countries: readonly { name: string }[]) => countries.map((c) => c.name);

describe('R-CTY-01 country data', () => {
  it('lists every country once with a well-formed code and currency', () => {
    const codes = COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toHaveLength(248);
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.currency).toMatch(/^[A-Z]{3}$/);
      expect(country.name.trim()).not.toBe('');
    }
  });

  it('has a spoken name for every default currency, and none left over', () => {
    const used = new Set(COUNTRIES.map((country) => country.currency));
    expect(new Set(Object.keys(CURRENCY_NAMES))).toEqual(used);
  });

  it('gives every default currency a known number of decimals', () => {
    for (const country of COUNTRIES) {
      expect(exponentOf(country.currency)).toBeGreaterThanOrEqual(0);
    }
  });

  it('fills the currency from the country (spec 10.1)', () => {
    const expected: Record<string, string> = {
      SG: 'SGD',
      MY: 'MYR',
      ID: 'IDR',
      BN: 'BND',
      SA: 'SAR',
      TR: 'TRY',
      KW: 'KWD',
      JP: 'JPY',
      GB: 'GBP',
      DE: 'EUR',
    };
    for (const [code, currency] of Object.entries(expected)) {
      expect(findCountry(code)?.currency).toBe(currency);
    }
  });

  it('names every common country', () => {
    expect(COMMON_COUNTRY_CODES).toHaveLength(12);
    expect(names(COMMON_COUNTRY_CODES.map((code) => findCountry(code) ?? { name: code }))).toEqual([
      'Singapore',
      'Malaysia',
      'Indonesia',
      'Brunei',
      'Saudi Arabia',
      'Palestine',
      'Yemen',
      'Syria',
      'Sudan',
      'Somalia',
      'Afghanistan',
      'Turkey',
    ]);
  });
});

describe('R-CTY-01 findCountry and currencyName', () => {
  it('finds a country by code and returns null for an unknown one', () => {
    expect(findCountry('SG')?.name).toBe('Singapore');
    expect(findCountry('XX')).toBeNull();
    expect(findCountry('sg')).toBeNull();
  });

  it('speaks a currency in the plural, and echoes an unknown code', () => {
    expect(currencyName('SGD')).toBe('Singapore dollars');
    expect(currencyName('XXX')).toBe('XXX');
  });
});

describe('R-CTY-01 foldForSearch', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(foldForSearch('  Côte d’Ivoire ')).toBe('cote d’ivoire');
    expect(foldForSearch('CURAÇAO')).toBe('curacao');
    expect(foldForSearch('São Tomé')).toBe('sao tome');
  });

  it('folds every country name to plain letters', () => {
    for (const country of COUNTRIES) {
      expect(foldForSearch(country.name)).toMatch(/^[a-z ().'’,-]+$/);
    }
  });
});

describe('R-CTY-01 searchCountries', () => {
  it('puts names that start with the text before names that only contain it', () => {
    const result = names(searchCountries('ma'));
    expect(result.indexOf('Malaysia')).toBeLessThan(result.indexOf('Somalia'));
    expect(result.indexOf('Mali')).toBeLessThan(result.indexOf('Somalia'));
    const startsWith = (name: string) => name.toLowerCase().startsWith('ma');
    const firstInside = result.findIndex((name) => !startsWith(name));
    expect(result.slice(0, firstInside).every(startsWith)).toBe(true);
    expect(result.slice(firstInside).some(startsWith)).toBe(false);
  });

  it('matches without accents and in any case', () => {
    expect(names(searchCountries('COTE'))).toEqual(["Côte d'Ivoire"]);
    expect(names(searchCountries('curacao'))).toEqual(['Curaçao']);
    expect(names(searchCountries('  sing '))).toEqual(['Singapore']);
  });

  it('finds nothing for text that matches no country', () => {
    expect(searchCountries('zzzz')).toEqual([]);
  });

  it('returns every country for an empty search', () => {
    expect(searchCountries('')).toHaveLength(248);
    expect(searchCountries('   ')).toHaveLength(248);
  });

  it('R-CTY-04: leaves out the home country', () => {
    expect(searchCountries('', 'SG')).toHaveLength(247);
    expect(names(searchCountries('sing', 'SG'))).toEqual([]);
    expect(names(searchCountries('sing', 'MY'))).toEqual(['Singapore']);
  });
});

describe('R-CTY-01 countryListSections', () => {
  it('shows the Common group first, then every other country, with nothing typed', () => {
    const sections = countryListSections('');
    expect(sections.map((section) => section.id)).toEqual(['common', 'all']);
    expect(sections[0]?.countries.map((country) => country.code)).toEqual(COMMON_COUNTRY_CODES);
    expect(sections[1]?.countries).toHaveLength(248 - COMMON_COUNTRY_CODES.length);
    const common = new Set(sections[0]?.countries.map((country) => country.code));
    expect(sections[1]?.countries.some((country) => common.has(country.code))).toBe(false);
  });

  it('R-CTY-04: drops the home country from both groups', () => {
    const sections = countryListSections('', 'SG');
    expect(sections[0]?.countries.map((country) => country.code)).toEqual(
      COMMON_COUNTRY_CODES.filter((code) => code !== 'SG'),
    );
    expect(sections[1]?.countries.some((country) => country.code === 'SG')).toBe(false);
  });

  it('shows one list of results once something is typed', () => {
    const sections = countryListSections('mal');
    expect(sections.map((section) => section.id)).toEqual(['results']);
    expect(names(sections[0]?.countries ?? [])).toContain('Malaysia');
  });

  it('shows no sections when nothing matches', () => {
    expect(countryListSections('zzzz')).toEqual([]);
  });

  it('treats spaces alone as nothing typed', () => {
    expect(countryListSections('   ').map((section) => section.id)).toEqual(['common', 'all']);
  });
});
