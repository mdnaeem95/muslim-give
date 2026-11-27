import type { RecurringMode, RecurringStatus } from './codes.js';
import { monthKeyOf, type CivilDate, type MonthKey } from './dates/civil-date.js';
import { addMonths, dueDateIn, monthsInclusive } from './dates/month-key.js';
import { sumByCurrency, type CurrencyTotal } from './totals.js';

export interface RecurringRule {
  readonly id: string;
  readonly dayOfMonth: number; // 1..31
  readonly startMonth: MonthKey;
  readonly resumeFromMonth: MonthKey | null;
  readonly mode: RecurringMode;
  readonly status: RecurringStatus;
  readonly amountMinor: number;
  readonly currency: string;
}

export interface OccurrenceToCreate {
  /** Deterministic (spec 7.3), so two devices or two runs produce the same record. */
  readonly id: string;
  readonly ruleId: string;
  readonly month: MonthKey;
  readonly dueDate: CivilDate;
  /** Auto mode logs the donation straight away; confirm mode waits for the person. */
  readonly status: 'logged' | 'pending';
  readonly amountMinor: number;
  readonly currency: string;
  readonly donationId: string | null;
}

export const occurrenceId = (ruleId: string, month: MonthKey): string => `occ_${ruleId}_${month}`;
export const occurrenceDonationId = (ruleId: string, month: MonthKey): string =>
  `don_${occurrenceId(ruleId, month)}`;

/**
 * Rule R-REC-03: every month from max(start, resume) to the current month whose due date is on
 * or before today and which has no occurrence yet. Paused and stopped rules generate nothing
 * (R-REC-07, R-REC-08). Running it twice, or after a sync, never adds a month twice.
 */
export function generateOccurrences(
  rule: RecurringRule,
  existingMonths: readonly MonthKey[],
  today: CivilDate,
): OccurrenceToCreate[] {
  if (rule.status !== 'active') return [];
  const from =
    rule.resumeFromMonth !== null && rule.resumeFromMonth > rule.startMonth
      ? rule.resumeFromMonth
      : rule.startMonth;
  const existing = new Set<MonthKey>(existingMonths);
  const occurrences: OccurrenceToCreate[] = [];
  for (const month of monthsInclusive(from, monthKeyOf(today))) {
    const dueDate = dueDateIn(month, rule.dayOfMonth);
    if (dueDate > today || existing.has(month)) continue;
    const isAuto = rule.mode === 'auto';
    occurrences.push({
      id: occurrenceId(rule.id, month),
      ruleId: rule.id,
      month,
      dueDate,
      status: isAuto ? 'logged' : 'pending',
      amountMinor: rule.amountMinor,
      currency: rule.currency,
      donationId: isAuto ? occurrenceDonationId(rule.id, month) : null,
    });
  }
  return occurrences;
}

/**
 * R-REC-05: the earlier months offered for back-fill at setup, i.e. every month from the start
 * month up to the month before the current one. Empty means no back-fill question is asked.
 */
export function backfillMonths(startMonth: MonthKey, today: CivilDate): MonthKey[] {
  return monthsInclusive(startMonth, addMonths(monthKeyOf(today), -1));
}

/**
 * R-REC-07: on resume, generation restarts next month if this month's due date has passed,
 * otherwise this month. Months skipped while paused stay skipped.
 */
export function resumeFromMonthOnResume(dayOfMonth: number, today: CivilDate): MonthKey {
  const thisMonth = monthKeyOf(today);
  return dueDateIn(thisMonth, dayOfMonth) <= today ? addMonths(thisMonth, 1) : thisMonth;
}

/** R-BUD-04 and R-REC-10: only active rules count towards the monthly figures. */
export function activeRules<R extends Pick<RecurringRule, 'status'>>(rules: readonly R[]): R[] {
  return rules.filter((rule) => rule.status === 'active');
}

/** R-REC-10: the monthly total of active rules, one figure per currency. */
export function monthlyGivingTotals(rules: readonly RecurringRule[]): CurrencyTotal[] {
  return sumByCurrency(activeRules(rules));
}
