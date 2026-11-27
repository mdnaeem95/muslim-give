import {
  budgetSchema,
  createEidPersonInputSchema,
  createRecurringRuleInputSchema,
  createReminderInputSchema,
  eidPacketGroupSchema,
  eidPlanSchema,
  profileSchema,
  promptStateSchema,
} from './records.js';
import { day, issuesOf } from './test-support.js';

describe('R-BUD-01 budget', () => {
  it('stores minor units with a currency; zero means no budget', () => {
    expect(budgetSchema.safeParse({ monthlyAmountMinor: 0, currency: 'SGD' }).success).toBe(true);
    expect(budgetSchema.safeParse({ monthlyAmountMinor: 50000, currency: 'SGD' }).success).toBe(
      true,
    );
    expect(budgetSchema.safeParse({ monthlyAmountMinor: -1, currency: 'SGD' }).success).toBe(false);
    expect(budgetSchema.safeParse({ monthlyAmountMinor: 5, currency: 'S' }).success).toBe(false);
  });
});

describe('spec 7.5 profile and prompt state', () => {
  const profile = {
    name: 'Isa',
    maritalStatus: 'married',
    homeCountryCode: 'SG',
    homeCurrency: 'SGD',
    hijriAdjust: 0,
    fridayReminder: false,
    fridayDismissedDate: null,
    welcomeSeen: true,
  };
  it('accepts a valid profile and enforces its limits', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, maritalStatus: null, name: '' }).success).toBe(
      true,
    );
    expect(profileSchema.safeParse({ ...profile, fridayDismissedDate: '2027-03-05' }).success).toBe(
      true,
    );
    expect(issuesOf(profileSchema.safeParse({ ...profile, name: 'a'.repeat(31) }))).toEqual([
      'name:profile.name_too_long',
    ]);
    expect(profileSchema.safeParse({ ...profile, hijriAdjust: 2 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, hijriAdjust: -1 }).success).toBe(true);
    expect(profileSchema.safeParse({ ...profile, maritalStatus: 'divorced' }).success).toBe(false);
  });
  it('limits the prompt to two asks', () => {
    expect(promptStateSchema.safeParse({ timesAsked: 0, lastAskedAt: null }).success).toBe(true);
    expect(
      promptStateSchema.safeParse({ timesAsked: 2, lastAskedAt: '2027-03-05T00:00:00.000Z' })
        .success,
    ).toBe(true);
    expect(promptStateSchema.safeParse({ timesAsked: 3, lastAskedAt: null }).success).toBe(false);
  });
});

describe('R-REC monthly giving input', () => {
  const rules = { today: day('2027-03-05'), maritalStatus: 'married' as const };
  const rule = {
    category: 'mosque',
    recipientName: 'Masjid Sultan',
    recipientRefId: 'sg-mosque-sultan',
    relationship: null,
    relationshipSide: null,
    relationshipLine: null,
    occasion: 'none',
    occasionOther: null,
    givingType: 'sadaqah',
    onBehalf: 'self',
    onBehalfName: null,
    note: null,
    amountMinor: 5000,
    currency: 'SGD',
    countryCode: 'SG',
    dayOfMonth: 31,
    startMonth: '2027-01',
    mode: 'auto',
  };
  const parse = (input: object) =>
    createRecurringRuleInputSchema(rules).safeParse({ ...rule, ...input });

  it('accepts a valid rule', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ startMonth: '2027-03', mode: 'confirm', dayOfMonth: 1 }).success).toBe(true);
  });
  it('R-REC-02 allows days 1 to 31 only', () => {
    for (const bad of [0, 32, 1.5]) {
      expect(issuesOf(parse({ dayOfMonth: bad }))).toEqual(['dayOfMonth:recurring.invalid_day']);
    }
  });
  it('does not allow a start month in the future', () => {
    expect(issuesOf(parse({ startMonth: '2027-04' }))).toEqual([
      'startMonth:recurring.start_in_future',
    ]);
  });
  it('does not allow a Friday-prayer occasion', () => {
    expect(issuesOf(parse({ occasion: 'friday_prayer' }))).toEqual([
      'occasion:recurring.friday_prayer_not_allowed',
    ]);
  });
  it('reuses the donation rules', () => {
    expect(issuesOf(parse({ recipientName: null }))).toEqual([
      'recipientName:donation.mosque_required',
    ]);
    expect(parse({ mode: 'sometimes' }).success).toBe(false);
  });
});

describe('R-YR yearly reminder input', () => {
  const reminder = {
    label: "Mak's birthday",
    monthDay: '02-29',
    occasion: 'birthday',
    category: 'individual',
    recipientName: 'Mak',
    recipientRefId: null,
    relationship: 'mother',
    relationshipSide: null,
    relationshipLine: null,
    lastAmountMinor: 5000,
    lastCurrency: 'SGD',
    lastDate: '2027-02-28',
    sourceDonationId: '018f3c2e-7b1a-7c3d-9e2f-1a2b3c4d5e6f',
  };
  const parse = (input: object, marital: 'single' | 'married' | null = 'married') =>
    createReminderInputSchema(marital).safeParse({ ...reminder, ...input });

  it('accepts a valid reminder including a 29 February anchor', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ sourceDonationId: null }).success).toBe(true);
  });
  it('limits the label to 40 characters and checks the date', () => {
    expect(parse({ label: 'a'.repeat(40) }).success).toBe(true);
    expect(issuesOf(parse({ label: 'a'.repeat(41) }))).toEqual(['label:reminder.label_too_long']);
    expect(parse({ monthDay: '02-30' }).success).toBe(false);
  });
  it('applies the recipient and relationship rules', () => {
    expect(issuesOf(parse({ relationship: null }))).toEqual([
      'relationship:donation.relationship_required',
    ]);
    expect(issuesOf(parse({ relationship: 'spouse' }, 'single'))).toEqual([
      'relationship:donation.spouse_not_available',
    ]);
  });
});

describe('R-EID Eid Planner input', () => {
  it('has one plan per year within a sensible range', () => {
    expect(
      eidPlanSchema.safeParse({ year: 2027, budgetMinor: 30000, currency: 'SGD' }).success,
    ).toBe(true);
    expect(
      issuesOf(eidPlanSchema.safeParse({ year: 1899, budgetMinor: 0, currency: 'SGD' })),
    ).toEqual(['year:eid.invalid_year']);
    expect(eidPlanSchema.safeParse({ year: 10000, budgetMinor: 0, currency: 'SGD' }).success).toBe(
      false,
    );
    expect(eidPlanSchema.safeParse({ year: 2027.5, budgetMinor: 0, currency: 'SGD' }).success).toBe(
      false,
    );
  });

  const person = {
    planId: 'plan-2027',
    name: 'Aiman',
    relationship: 'nephew',
    relationshipSide: null,
    relationshipLine: null,
    group: 'kids',
    amountMinor: 1000,
  };
  const parsePerson = (input: object, marital: 'single' | 'married' | null = 'married') =>
    createEidPersonInputSchema(marital).safeParse({ ...person, ...input });

  it('R-EID-04 adds a named person with an amount', () => {
    expect(parsePerson({}).success).toBe(true);
    expect(parsePerson({ name: '' }).success).toBe(false);
    expect(parsePerson({ name: 'a'.repeat(41) }).success).toBe(false);
    expect(parsePerson({ amountMinor: 0 }).success).toBe(false);
    expect(parsePerson({ group: 'strangers' }).success).toBe(false);
  });
  it('excludes Stranger and filters spouse options for single users', () => {
    expect(issuesOf(parsePerson({ relationship: 'stranger' }))).toEqual([
      'relationship:eid.stranger_not_allowed',
    ]);
    expect(issuesOf(parsePerson({ relationship: 'spouse' }, 'single'))).toEqual([
      'relationship:donation.spouse_not_available',
    ]);
    expect(parsePerson({ relationship: 'spouse' }, 'married').success).toBe(true);
    expect(
      parsePerson({
        relationship: 'uncle',
        relationshipSide: 'spouse',
        relationshipLine: 'maternal',
      }).success,
    ).toBe(true);
  });

  it('R-EID-07 packet groups hold 0 to 999 packets', () => {
    const group = { planId: 'plan-2027', groupKey: 'kids', count: 3, amountEachMinor: 200 };
    expect(eidPacketGroupSchema.safeParse(group).success).toBe(true);
    expect(
      eidPacketGroupSchema.safeParse({ ...group, count: 0, groupKey: 'elderly' }).success,
    ).toBe(true);
    expect(eidPacketGroupSchema.safeParse({ ...group, count: 999 }).success).toBe(true);
    for (const bad of [-1, 1000, 1.5]) {
      expect(eidPacketGroupSchema.safeParse({ ...group, count: bad }).success).toBe(false);
    }
    expect(eidPacketGroupSchema.safeParse({ ...group, groupKey: 'others' }).success).toBe(false);
  });
});
