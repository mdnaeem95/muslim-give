/**
 * One spoken label for a row made of several parts, e.g. "Masjid Sultan, Zakat, 50 Singapore
 * dollars". Empty and missing parts are skipped so the screen reader never says "undefined".
 */
export function joinLabel(parts: readonly (string | null | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(', ');
}

/** What a screen reader says for an alert: the level first, then the message. */
export function alertLabel(prefix: string, message: string): string {
  return `${prefix}. ${message}`;
}
