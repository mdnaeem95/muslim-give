import { COUNTRIES, type Country } from './country-data.js';
import { CURRENCY_NAMES } from './currency-names.js';

export { COUNTRIES, type Country };

/** The "Common" group of the country picker, in the order the spec lists them (spec 10.1). */
export const COMMON_COUNTRY_CODES: readonly string[] = [
  'SG',
  'MY',
  'ID',
  'BN',
  'SA',
  'PS',
  'YE',
  'SY',
  'SD',
  'SO',
  'AF',
  'TR',
];

const BY_CODE = new Map<string, Country>(COUNTRIES.map((country) => [country.code, country]));

/** The country with this ISO 3166-1 code, or null when there is none. */
export function findCountry(code: string): Country | null {
  return BY_CODE.get(code) ?? null;
}

/** "Singapore dollars" for SGD; an unknown code is returned as it was given. */
export function currencyName(code: string): string {
  return CURRENCY_NAMES[code] ?? code;
}

const ACCENTS: Readonly<Record<string, string>> = {
  å: 'a',
  é: 'e',
  ç: 'c',
  ô: 'o',
  í: 'i',
  ã: 'a',
  ü: 'u',
  ö: 'o',
  ñ: 'n',
  ā: 'a',
  ī: 'i',
  ū: 'u',
};

/**
 * Lower-case text without accents, so "Cote", "côte" and "COTE" all match (spec 10.1). A table
 * rather than `String.normalize`, whose support differs between Hermes builds; a test checks
 * that every country name folds to plain letters.
 */
export function foldForSearch(text: string): string {
  let folded = '';
  for (const letter of text.toLowerCase()) folded += ACCENTS[letter] ?? letter;
  return folded.trim();
}

/**
 * Countries matching what was typed: names that start with it first, then names that contain it
 * (spec 10.1). Order within each group is the list's own (alphabetical). An empty search matches
 * everything. `excludeCode` removes the home country from the Overseas list (R-CTY-04).
 */
export function searchCountries(query: string, excludeCode?: string): readonly Country[] {
  const needle = foldForSearch(query);
  const prefix: Country[] = [];
  const inside: Country[] = [];
  for (const country of COUNTRIES) {
    if (country.code === excludeCode) continue;
    const name = foldForSearch(country.name);
    if (name.startsWith(needle)) prefix.push(country);
    else if (name.includes(needle)) inside.push(country);
  }
  return [...prefix, ...inside];
}

export type CountryListSectionId = 'common' | 'all' | 'results';

export interface CountryListSection {
  readonly id: CountryListSectionId;
  readonly countries: readonly Country[];
}

/**
 * What the picker shows. With nothing typed: the "Common" group, then every other country. Once
 * something is typed: a single list of matches, since a group heading would only get in the way.
 * A search with no match gives no sections, so the screen can say so.
 */
export function countryListSections(
  query: string,
  excludeCode?: string,
): readonly CountryListSection[] {
  if (foldForSearch(query) !== '') {
    const countries = searchCountries(query, excludeCode);
    return countries.length === 0 ? [] : [{ id: 'results', countries }];
  }
  const everyone = searchCountries('', excludeCode);
  const common = COMMON_COUNTRY_CODES.flatMap((code) =>
    everyone.filter((country) => country.code === code),
  );
  const rest = everyone.filter((country) => !COMMON_COUNTRY_CODES.includes(country.code));
  return [
    { id: 'common', countries: common },
    { id: 'all', countries: rest },
  ];
}
