import {
  addDays,
  daysBetween,
  monthDayInYear,
  type CivilDate,
  type MonthDay,
} from './dates/civil-date.js';

export interface ReminderKeyFields {
  readonly monthDay: MonthDay;
  readonly label: string;
}

/** R-YR-02: upsert key is (month-day, label compared case-insensitively). */
export function sameReminder(a: ReminderKeyFields, b: ReminderKeyFields): boolean {
  return a.monthDay === b.monthDay && a.label.trim().toLowerCase() === b.label.trim().toLowerCase();
}

/** R-YR-02: the existing reminder a new one should update instead of duplicating, if any. */
export function findMatchingReminder<R extends ReminderKeyFields>(
  reminders: readonly R[],
  candidate: ReminderKeyFields,
): R | null {
  return reminders.find((reminder) => sameReminder(reminder, candidate)) ?? null;
}

/**
 * R-YR-03: the next date on or after `today` that falls on the Gregorian month-day.
 * 29 February falls on 28 February in non-leap years.
 */
export function nextOccurrence(monthDay: MonthDay, today: CivilDate): CivilDate {
  const year = Number(today.slice(0, 4));
  const thisYear = monthDayInYear(monthDay, year);
  return thisYear >= today ? thisYear : monthDayInYear(monthDay, year + 1);
}

export interface DueReminder<R> {
  readonly reminder: R;
  readonly date: CivilDate;
  /** 0 = today, 1 = tomorrow, and so on (shown as "Today", "Tomorrow", "in {n} days"). */
  readonly inDays: number;
}

/** R-YR-04: reminders due from today to `withinDays` ahead (7 by default), soonest first. */
export function dueReminders<R extends ReminderKeyFields>(
  reminders: readonly R[],
  today: CivilDate,
  withinDays = 7,
): DueReminder<R>[] {
  return reminders
    .map((reminder) => {
      const date = nextOccurrence(reminder.monthDay, today);
      return { reminder, date, inDays: daysBetween(today, date) };
    })
    .filter((due) => due.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays || a.reminder.label.localeCompare(b.reminder.label));
}

/** R-YR-05: notifications go out 7 days before and on the day itself. */
export function reminderNotificationDates(occurrence: CivilDate): {
  readonly sevenDaysBefore: CivilDate;
  readonly onTheDay: CivilDate;
} {
  return { sevenDaysBefore: addDays(occurrence, -7), onTheDay: occurrence };
}
