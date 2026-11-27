import { d, md } from './test-support.js';
import {
  dueReminders,
  findMatchingReminder,
  nextOccurrence,
  reminderNotificationDates,
  sameReminder,
} from './reminders.js';

interface R {
  readonly id: number;
  readonly monthDay: ReturnType<typeof md>;
  readonly label: string;
}

describe('R-YR-02 upsert key', () => {
  const a = { monthDay: md('03-15'), label: "Aisyah's birthday" };
  it('matches on month-day and label, ignoring case and spaces', () => {
    expect(sameReminder(a, { monthDay: md('03-15'), label: "  aisyah's BIRTHDAY " })).toBe(true);
    expect(sameReminder(a, { monthDay: md('03-16'), label: a.label })).toBe(false);
    expect(sameReminder(a, { monthDay: a.monthDay, label: 'Anniversary' })).toBe(false);
  });
  it('finds the reminder to update, or none', () => {
    const list: R[] = [
      { id: 1, ...a },
      { id: 2, monthDay: md('07-01'), label: 'Anniversary' },
    ];
    expect(findMatchingReminder(list, { monthDay: md('07-01'), label: 'anniversary' })?.id).toBe(2);
    expect(findMatchingReminder(list, { monthDay: md('07-02'), label: 'Anniversary' })).toBe(null);
  });
});

describe('R-YR-03 next occurrence', () => {
  it('uses this year if the date has not passed, else next year', () => {
    expect(nextOccurrence(md('03-15'), d('2027-03-10'))).toBe('2027-03-15');
    expect(nextOccurrence(md('03-15'), d('2027-03-15'))).toBe('2027-03-15');
    expect(nextOccurrence(md('03-15'), d('2027-03-16'))).toBe('2028-03-15');
  });
  it('moves 29 February to 28 February in non-leap years', () => {
    expect(nextOccurrence(md('02-29'), d('2027-01-10'))).toBe('2027-02-28');
    expect(nextOccurrence(md('02-29'), d('2027-03-01'))).toBe('2028-02-29');
  });
});

describe('R-YR-04 dates to remember', () => {
  const today = d('2027-03-10');
  const list: R[] = [
    { id: 1, monthDay: md('03-10'), label: 'Today one' },
    { id: 2, monthDay: md('03-12'), label: 'Zainab' },
    { id: 3, monthDay: md('03-12'), label: 'Ahmad' },
    { id: 4, monthDay: md('03-17'), label: 'Seven days' },
    { id: 5, monthDay: md('03-18'), label: 'Eight days' },
  ];
  it('lists reminders due within 7 days, soonest first, ties by label', () => {
    const due = dueReminders(list, today);
    expect(due.map((x) => x.reminder.id)).toEqual([1, 3, 2, 4]);
    expect(due.map((x) => x.inDays)).toEqual([0, 2, 2, 7]);
    expect(due[0]?.date).toBe('2027-03-10');
  });
  it('can use another window', () => {
    expect(dueReminders(list, today, 0).map((x) => x.reminder.id)).toEqual([1]);
  });
  it('looks across the new year', () => {
    const due = dueReminders(
      [{ id: 9, monthDay: md('01-02'), label: 'New year' }],
      d('2027-12-28'),
    );
    expect(due[0]?.date).toBe('2028-01-02');
    expect(due[0]?.inDays).toBe(5);
  });
});

describe('R-YR-05 notification dates', () => {
  it('notifies 7 days before and on the day', () => {
    expect(reminderNotificationDates(d('2027-03-15'))).toEqual({
      sevenDaysBefore: '2027-03-08',
      onTheDay: '2027-03-15',
    });
  });
});
