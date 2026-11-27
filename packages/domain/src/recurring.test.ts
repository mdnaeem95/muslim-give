import { d, mk } from './test-support.js';
import {
  activeRules,
  backfillMonths,
  generateOccurrences,
  monthlyGivingTotals,
  occurrenceDonationId,
  occurrenceId,
  resumeFromMonthOnResume,
  type RecurringRule,
} from './recurring.js';

const rule: RecurringRule = {
  id: 'r1',
  dayOfMonth: 31,
  startMonth: mk('2027-01'),
  resumeFromMonth: null,
  mode: 'auto',
  status: 'active',
  amountMinor: 1000,
  currency: 'SGD',
};

describe('R-REC-03 generate', () => {
  it('creates every due month with deterministic IDs and a snapshot amount', () => {
    const made = generateOccurrences(rule, [], d('2027-04-30'));
    expect(made.map((o) => o.month)).toEqual(['2027-01', '2027-02', '2027-03', '2027-04']);
    expect(made[0]).toEqual({
      id: 'occ_r1_2027-01',
      ruleId: 'r1',
      month: '2027-01',
      dueDate: '2027-01-31',
      status: 'logged',
      amountMinor: 1000,
      currency: 'SGD',
      donationId: 'don_occ_r1_2027-01',
    });
  });
  it('R-REC-02 clamps 31 to the last day of shorter months', () => {
    const made = generateOccurrences(rule, [], d('2027-04-30'));
    expect(made.map((o) => o.dueDate)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
  });
  it('waits for the due date', () => {
    expect(generateOccurrences(rule, [], d('2027-04-29')).map((o) => o.month)).toEqual([
      '2027-01',
      '2027-02',
      '2027-03',
    ]);
  });
  it('skips months that already have an occurrence, so a second run adds nothing', () => {
    const first = generateOccurrences(rule, [], d('2027-04-30'));
    expect(generateOccurrences(rule, [mk('2027-02')], d('2027-04-30')).map((o) => o.month)).toEqual(
      ['2027-01', '2027-03', '2027-04'],
    );
    expect(
      generateOccurrences(
        rule,
        first.map((o) => o.month),
        d('2027-04-30'),
      ),
    ).toEqual([]);
  });
  it('creates pending occurrences without a donation in confirm mode', () => {
    const made = generateOccurrences({ ...rule, mode: 'confirm' }, [], d('2027-01-31'));
    expect(made).toHaveLength(1);
    expect(made[0]?.status).toBe('pending');
    expect(made[0]?.donationId).toBe(null);
  });
  it('R-REC-07 generates nothing while paused or stopped', () => {
    expect(generateOccurrences({ ...rule, status: 'paused' }, [], d('2027-04-30'))).toEqual([]);
    expect(generateOccurrences({ ...rule, status: 'stopped' }, [], d('2027-04-30'))).toEqual([]);
  });
  it('starts from the later of the start month and the resume month', () => {
    const later = { ...rule, resumeFromMonth: mk('2027-03') };
    expect(generateOccurrences(later, [], d('2027-04-30')).map((o) => o.month)).toEqual([
      '2027-03',
      '2027-04',
    ]);
    const earlier = { ...rule, resumeFromMonth: mk('2026-06') };
    expect(generateOccurrences(earlier, [], d('2027-01-31')).map((o) => o.month)).toEqual([
      '2027-01',
    ]);
    const same = { ...rule, resumeFromMonth: mk('2027-01') };
    expect(generateOccurrences(same, [], d('2027-01-31'))).toHaveLength(1);
  });
  it('generates nothing for a start month in the future', () => {
    expect(generateOccurrences(rule, [], d('2026-12-31'))).toEqual([]);
  });
  it('handles 29 February in leap and non-leap years', () => {
    const leap = { ...rule, dayOfMonth: 29, startMonth: mk('2028-02') };
    expect(generateOccurrences(leap, [], d('2028-02-29'))[0]?.dueDate).toBe('2028-02-29');
    const plain = { ...rule, dayOfMonth: 29, startMonth: mk('2027-02') };
    expect(generateOccurrences(plain, [], d('2027-02-28'))[0]?.dueDate).toBe('2027-02-28');
  });
  it('builds IDs from the rule and month', () => {
    expect(occurrenceId('r1', mk('2027-01'))).toBe('occ_r1_2027-01');
    expect(occurrenceDonationId('r1', mk('2027-01'))).toBe('don_occ_r1_2027-01');
  });
});

describe('R-REC-05 back-fill', () => {
  it('offers the months before the current one', () => {
    expect(backfillMonths(mk('2027-01'), d('2027-04-10'))).toEqual([
      '2027-01',
      '2027-02',
      '2027-03',
    ]);
  });
  it('asks nothing when the rule starts this month', () => {
    expect(backfillMonths(mk('2027-04'), d('2027-04-10'))).toEqual([]);
  });
});

describe('R-REC-07 resume', () => {
  it('restarts next month if this months due date has passed, otherwise this month', () => {
    expect(resumeFromMonthOnResume(15, d('2027-04-20'))).toBe('2027-05');
    expect(resumeFromMonthOnResume(15, d('2027-04-15'))).toBe('2027-05');
    expect(resumeFromMonthOnResume(15, d('2027-04-10'))).toBe('2027-04');
    expect(resumeFromMonthOnResume(15, d('2027-12-20'))).toBe('2028-01');
  });
});

describe('R-REC-10 monthly totals', () => {
  it('sums active rules per currency and ignores paused and stopped ones', () => {
    const rules: RecurringRule[] = [
      rule,
      { ...rule, id: 'r2', currency: 'MYR', amountMinor: 500 },
      { ...rule, id: 'r3', status: 'paused', amountMinor: 9999 },
      { ...rule, id: 'r4', status: 'stopped', amountMinor: 9999 },
    ];
    expect(activeRules(rules)).toHaveLength(2);
    expect(monthlyGivingTotals(rules)).toEqual([
      { currency: 'MYR', amountMinor: 500 },
      { currency: 'SGD', amountMinor: 1000 },
    ]);
  });
});
