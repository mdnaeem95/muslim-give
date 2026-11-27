import { weekdayOf, type CivilDate } from './dates/civil-date.js';
import { isEidEntry, type HomeContext, type LedgerEntry } from './ledger.js';
import { isHomeEntry, isOverseas } from './totals.js';

const FRIDAY = 5;

export function isFriday(date: CivilDate): boolean {
  return weekdayOf(date) === FRIDAY;
}

export interface FridayCardInput {
  readonly today: CivilDate;
  /** Profile toggle (R-FRI-01, off by default). */
  readonly enabled: boolean;
  readonly dismissedDate: CivilDate | null;
  readonly hasEntryDatedToday: boolean;
}

/**
 * R-FRI-02: the card shows on Fridays (device-local day) when the reminder is on, unless it was
 * dismissed today or any entry is dated today.
 */
export function isFridayCardVisible(input: FridayCardInput): boolean {
  return (
    input.enabled &&
    isFriday(input.today) &&
    input.dismissedDate !== input.today &&
    !input.hasEntryDatedToday
  );
}

/**
 * R-FRI-03: "Log {amount} to {recipient} again" repeats the most recent Friday gift that was
 * home currency, not overseas and not from the Eid Planner. Null means "Log a donation".
 * When two qualify on the same date, the later one in the list wins.
 */
export function fridayRepeatCandidate<E extends LedgerEntry>(
  entries: readonly E[],
  home: HomeContext,
): E | null {
  let best: E | null = null;
  for (const entry of entries) {
    const qualifies =
      isFriday(entry.date) &&
      isHomeEntry(entry, home) &&
      !isOverseas(entry, home) &&
      !isEidEntry(entry);
    if (qualifies && (best === null || entry.date >= best.date)) best = entry;
  }
  return best;
}
