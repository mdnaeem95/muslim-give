/**
 * Minor-unit exponents for ISO 4217 currencies that do NOT use 2 decimals.
 * Any other well-formed code defaults to 2.
 * TODO(ADR-006): replace with the table generated from CLDR (spec 7.1) and add a
 * CI check that the generated file is up to date.
 */
export const NON_DEFAULT_EXPONENTS: Readonly<Record<string, number>> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};
export const DEFAULT_EXPONENT = 2;
