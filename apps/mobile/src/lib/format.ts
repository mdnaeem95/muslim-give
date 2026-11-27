import { HIJRI_MONTH_NAMES, type CivilDate, type HijriDate } from '@muslim-give/domain';

const MONTH_ABBREVIATIONS = 'JanFebMarAprMayJunJulAugSepOctNovDec';

/** "5 Mar 2027", as in the prototype (spec 6.7). No `Intl`: Hermes support differs by platform. */
export function formatCivilDate(date: CivilDate): string {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const name = MONTH_ABBREVIATIONS.slice((month - 1) * 3, month * 3);
  return `${String(day)} ${name} ${date.slice(0, 4)}`;
}

/** "25 Syaaban 1448 AH", with the Malay month names of rule R-HIJ-05. */
export function formatHijriDate(date: HijriDate): string {
  const name = HIJRI_MONTH_NAMES[date.month - 1] ?? '';
  return `${String(date.day)} ${name} ${String(date.year)} AH`;
}
