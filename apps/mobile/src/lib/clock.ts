import { makeCivilDate, type CivilDate } from '@muslim-give/domain';

/** A calendar day as read from the device, in its own time zone. */
export interface LocalDay {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..31
}

/**
 * The only way screens learn what day it is (spec 6.2, 7.2). Components never read the system
 * clock, so tests and screenshots can fix "today".
 */
export interface Clock {
  today(): CivilDate;
}

export const createClock = (readDay: () => LocalDay): Clock => ({
  today: () => {
    const { year, month, day } = readDay();
    return makeCivilDate(year, month, day);
  },
});
