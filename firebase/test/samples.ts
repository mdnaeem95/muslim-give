import { serverTimestamp, Timestamp } from 'firebase/firestore';

export type Doc = Record<string, unknown>;

const INSTANT = '2026-11-28T02:00:00.000Z';

/** The sync columns every record carries (spec 7.6). */
export function meta(id: string, hlc = '0000000000100-0000-device-a'): Doc {
  return {
    id,
    createdAt: INSTANT,
    updatedAt: INSTANT,
    _hlc: hlc,
    _deleted: false,
    _deviceId: 'device-a',
    _schema: 1,
    _serverUpdatedAt: serverTimestamp(),
  };
}

/** A time the phone made up, which the rules must refuse in place of the server's. */
export const clientTimestamp = Timestamp.fromMillis(1_000);

const recipient: Doc = {
  category: 'mosque',
  recipientName: 'Masjid Sultan',
  recipientRefId: null,
  relationship: null,
  relationshipSide: null,
  relationshipLine: null,
};

const description: Doc = {
  ...recipient,
  occasion: 'friday_prayer',
  occasionOther: null,
  givingType: 'sadaqah',
  onBehalf: 'self',
  onBehalfName: null,
  note: null,
};

export interface Sample {
  /** Where the record lives under `users/{uid}/`. */
  readonly path: (id: string) => string;
  /** The id the record must carry. */
  readonly id: string;
  /** A valid record, with the sync columns. */
  readonly make: (hlc?: string) => Doc;
  /** Changes that each make a valid record invalid, with what is wrong. */
  readonly invalid: readonly (readonly [string, Doc])[];
  /** Changes that stay valid because they are exactly at a limit. */
  readonly valid: readonly (readonly [string, Doc])[];
}

const text = (length: number): string => 'x'.repeat(length);

export const SAMPLES: Readonly<Record<string, Sample>> = {
  donations: {
    path: (id) => `donations/${id}`,
    id: 'don-1',
    make: (hlc) => ({
      ...meta('don-1', hlc),
      ...description,
      date: '2026-11-27',
      amountMinor: 1000,
      currency: 'SGD',
      countryCode: 'SG',
      source: 'manual',
      recurringRuleId: null,
      occurrenceMonth: null,
      eidPlanId: null,
      eidPersonId: null,
      eidPacketGroup: null,
    }),
    invalid: [
      ['zero amount', { amountMinor: 0 }],
      ['negative amount', { amountMinor: -5 }],
      ['fractional amount', { amountMinor: 1.5 }],
      ['text amount', { amountMinor: '10' }],
      ['amount above the safe integer', { amountMinor: 9007199254740992 }],
      ['lower-case currency', { currency: 'sgd' }],
      ['four-letter currency', { currency: 'SGDX' }],
      ['three-letter country', { countryCode: 'SGP' }],
      ['date in the wrong format', { date: '27-11-2026' }],
      ['unknown category', { category: 'bank' }],
      ['note over 120', { note: text(121) }],
      ['recipient name over 80', { recipientName: text(81) }],
      ['occasion text over 60', { occasionOther: text(61) }],
      ['unknown source', { source: 'bot' }],
      ['unknown occasion', { occasion: 'party' }],
      ['unknown giving type', { givingType: 'gift' }],
      ['unknown packet group', { eidPacketGroup: 'adults' }],
      ['occurrence month in the wrong format', { occurrenceMonth: '2026-1' }],
      ['hlc that is not text', { _hlc: 5 }],
      ['empty hlc', { _hlc: '' }],
      ['deleted that is not a flag', { _deleted: 'no' }],
      ['schema that is not a number', { _schema: 'one' }],
    ],
    valid: [
      ['note of exactly 120', { note: text(120) }],
      ['recipient name of exactly 80', { recipientName: text(80) }],
      ['a deleted record (tombstone)', { _deleted: true }],
      ['an individual with a relationship', { category: 'individual', relationship: 'mother' }],
    ],
  },
  receipts: {
    path: (id) => `receipts/${id}`,
    id: 'rec-1',
    make: (hlc) => ({
      ...meta('rec-1', hlc),
      donationId: 'don-1',
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      sha256: 'a'.repeat(64),
      width: 100,
      height: 100,
    }),
    invalid: [
      ['file over 10 MB', { sizeBytes: 10485761 }],
      ['empty file', { sizeBytes: 0 }],
      ['short checksum', { sha256: 'abc' }],
      ['upper-case checksum', { sha256: 'A'.repeat(64) }],
      ['file name over 100', { fileName: text(101) }],
      ['missing donation', { donationId: 5 }],
    ],
    valid: [
      ['file of exactly 10 MB', { sizeBytes: 10485760 }],
      ['no dimensions', { width: null, height: null }],
    ],
  },
  recurringRules: {
    path: (id) => `recurringRules/${id}`,
    id: 'rule-1',
    make: (hlc) => ({
      ...meta('rule-1', hlc),
      ...description,
      amountMinor: 5000,
      currency: 'SGD',
      countryCode: 'SG',
      dayOfMonth: 5,
      startMonth: '2026-11',
      mode: 'auto',
      status: 'active',
      resumeFromMonth: null,
      backfillDecided: false,
    }),
    invalid: [
      ['day 0', { dayOfMonth: 0 }],
      ['day 32', { dayOfMonth: 32 }],
      ['unknown mode', { mode: 'manual' }],
      ['unknown status', { status: 'gone' }],
      ['start month in the wrong format', { startMonth: '2026-1' }],
      ['zero amount', { amountMinor: 0 }],
      ['backfill that is not a flag', { backfillDecided: 'yes' }],
    ],
    valid: [
      ['day 31', { dayOfMonth: 31 }],
      ['paused with a resume month', { status: 'paused', resumeFromMonth: '2027-01' }],
    ],
  },
  recurringOccurrences: {
    path: (id) => `recurringOccurrences/${id}`,
    id: 'occ_rule-1_2026-11',
    make: (hlc) => ({
      ...meta('occ_rule-1_2026-11', hlc),
      ruleId: 'rule-1',
      month: '2026-11',
      dueDate: '2026-11-05',
      status: 'pending',
      amountMinor: 5000,
      currency: 'SGD',
      donationId: null,
    }),
    invalid: [
      ['unknown status', { status: 'done' }],
      ['month in the wrong format', { month: '11-2026' }],
      ['due date in the wrong format', { dueDate: '5 Nov' }],
      ['zero amount', { amountMinor: 0 }],
    ],
    valid: [
      ['logged with its donation', { status: 'logged', donationId: 'don_occ_rule-1_2026-11' }],
    ],
  },
  reminders: {
    path: (id) => `reminders/${id}`,
    id: 'rem-1',
    make: (hlc) => ({
      ...meta('rem-1', hlc),
      category: 'individual',
      recipientName: 'Mak',
      recipientRefId: null,
      relationship: 'mother',
      relationshipSide: null,
      relationshipLine: null,
      label: 'Mak birthday',
      monthDay: '03-05',
      occasion: 'birthday',
      lastAmountMinor: 5000,
      lastCurrency: 'SGD',
      lastDate: '2026-03-05',
      sourceDonationId: null,
    }),
    invalid: [
      ['label over 40', { label: text(41) }],
      ['month-day in the wrong format', { monthDay: '3-5' }],
      ['unknown occasion', { occasion: 'party' }],
      ['zero last amount', { lastAmountMinor: 0 }],
    ],
    valid: [['label of exactly 40', { label: text(40) }]],
  },
  eidPlans: {
    path: (id) => `eidPlans/${id}`,
    id: 'plan-2027',
    make: (hlc) => ({ ...meta('plan-2027', hlc), year: 2027, budgetMinor: 50000, currency: 'SGD' }),
    invalid: [
      ['year 1899', { year: 1899 }],
      ['negative budget', { budgetMinor: -1 }],
      ['bad currency', { currency: 'S$' }],
    ],
    valid: [['a budget of zero', { budgetMinor: 0 }]],
  },
  eidPeople: {
    path: (id) => `eidPeople/${id}`,
    id: 'person-1',
    make: (hlc) => ({
      ...meta('person-1', hlc),
      planId: 'plan-2027',
      name: 'Aisyah',
      relationship: 'kids',
      relationshipSide: null,
      relationshipLine: null,
      group: 'kids',
      amountMinor: 500,
      donationId: null,
    }),
    invalid: [
      ['name over 40', { name: text(41) }],
      ['unknown group', { group: 'adults' }],
      ['unknown relationship', { relationship: 'neighbour' }],
      ['zero amount', { amountMinor: 0 }],
    ],
    valid: [['name of exactly 40', { name: text(40) }]],
  },
  eidPacketGroups: {
    path: (id) => `eidPacketGroups/${id}`,
    id: 'packets-kids',
    make: (hlc) => ({
      ...meta('packets-kids', hlc),
      planId: 'plan-2027',
      groupKey: 'kids',
      count: 10,
      amountEachMinor: 200,
    }),
    invalid: [
      ['count 1000', { count: 1000 }],
      ['negative count', { count: -1 }],
      ['unknown group', { groupKey: 'adults' }],
    ],
    valid: [['count 999', { count: 999 }]],
  },
  'singletons/budget': {
    path: () => 'singletons/budget',
    id: 'budget',
    make: (hlc) => ({
      ...meta('budget', hlc),
      monthlyAmountMinor: 20000,
      currency: 'SGD',
    }),
    invalid: [
      ['negative budget', { monthlyAmountMinor: -1 }],
      ['bad currency', { currency: 'sgd' }],
    ],
    valid: [['no budget (zero)', { monthlyAmountMinor: 0 }]],
  },
  'singletons/profile': {
    path: () => 'singletons/profile',
    id: 'profile',
    make: (hlc) => ({
      ...meta('profile', hlc),
      name: 'Naeem',
      maritalStatus: null,
      homeCountryCode: 'SG',
      homeCurrency: 'SGD',
      hijriAdjust: 0,
      fridayReminder: false,
      fridayDismissedDate: null,
      welcomeSeen: true,
    }),
    invalid: [
      ['Hijri adjustment of 2', { hijriAdjust: 2 }],
      ['name over 30', { name: text(31) }],
      ['lower-case country', { homeCountryCode: 'sg' }],
      ['unknown marital status', { maritalStatus: 'engaged' }],
      ['reminder that is not a flag', { fridayReminder: 'yes' }],
    ],
    valid: [
      ['name of exactly 30', { name: text(30) }],
      [
        'married with a dismissed date',
        { maritalStatus: 'married', fridayDismissedDate: '2026-11-27' },
      ],
    ],
  },
  'singletons/promptState': {
    path: () => 'singletons/promptState',
    id: 'prompt_state',
    make: (hlc) => ({ ...meta('prompt_state', hlc), timesAsked: 1, lastAskedAt: null }),
    invalid: [
      ['asked 3 times', { timesAsked: 3 }],
      ['asked -1 times', { timesAsked: -1 }],
    ],
    valid: [
      ['asked twice, with a time', { timesAsked: 2, lastAskedAt: '2026-11-28T02:00:00.000Z' }],
    ],
  },
};
