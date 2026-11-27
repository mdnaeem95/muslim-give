import {
  CATEGORIES,
  DONATION_SOURCES,
  EID_PACKET_GROUP_KEYS,
  EID_PERSON_GROUPS,
  GIVING_TYPES,
  HIJRI_ADJUSTMENTS,
  MARITAL_STATUSES,
  OCCASIONS,
  OCCURRENCE_STATUSES,
  ON_BEHALF,
  RECURRING_MODES,
  RECURRING_STATUSES,
  RELATIONSHIP_LINES,
  RELATIONSHIP_SIDES,
  RELATIONSHIPS,
} from '@muslim-give/domain';
import { LIMITS } from '@muslim-give/schema';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import {
  civilDate,
  flag,
  isoCode,
  monthKey,
  nullOrCivilDate,
  nullOrMaxLength,
  nullOrOneOf,
  oneOf,
  syncColumns,
} from './helpers.js';

/** Who a gift went to. Shared by donations, monthly giving and reminders (spec 7.5). */
const recipientColumns = {
  category: text('category').notNull(),
  recipientName: text('recipient_name'),
  recipientRefId: text('recipient_ref_id'),
  relationship: text('relationship'),
  relationshipSide: text('relationship_side'),
  relationshipLine: text('relationship_line'),
};

/** Table-level rules for the recipient columns: the database refuses what the domain refuses. */
const recipientChecks = (
  name: string,
  t: Record<keyof typeof recipientColumns, AnySQLiteColumn>,
) => [
  check(`${name}_category`, oneOf(t.category, CATEGORIES)),
  check(`${name}_relationship`, nullOrOneOf(t.relationship, RELATIONSHIPS)),
  check(`${name}_side`, nullOrOneOf(t.relationshipSide, RELATIONSHIP_SIDES)),
  check(`${name}_line`, nullOrOneOf(t.relationshipLine, RELATIONSHIP_LINES)),
  check(`${name}_recipient_len`, nullOrMaxLength(t.recipientName, LIMITS.recipientName)),
  // Mosques and charities need a name; relationship fields belong to individuals only.
  check(
    `${name}_recipient_rules`,
    sql`(${t.category} = 'individual' or (${t.recipientName} is not null and length(${t.recipientName}) > 0))
      and (${t.category} = 'individual' or (${t.relationship} is null and ${t.relationshipSide} is null and ${t.relationshipLine} is null))`,
  ),
];

const occasionColumns = {
  occasion: text('occasion').notNull(),
  occasionOther: text('occasion_other'),
  givingType: text('giving_type').notNull(),
  onBehalf: text('on_behalf').notNull(),
  onBehalfName: text('on_behalf_name'),
  note: text('note'),
};

const occasionChecks = (name: string, t: Record<keyof typeof occasionColumns, AnySQLiteColumn>) => [
  check(`${name}_occasion`, oneOf(t.occasion, OCCASIONS)),
  check(`${name}_giving_type`, oneOf(t.givingType, GIVING_TYPES)),
  check(`${name}_on_behalf`, oneOf(t.onBehalf, ON_BEHALF)),
  check(`${name}_occasion_other_len`, nullOrMaxLength(t.occasionOther, LIMITS.occasionOther)),
  check(`${name}_on_behalf_name_len`, nullOrMaxLength(t.onBehalfName, LIMITS.onBehalfName)),
  check(`${name}_note_len`, nullOrMaxLength(t.note, LIMITS.note)),
  check(`${name}_occasion_other_rule`, sql`${t.occasionOther} is null or ${t.occasion} = 'other'`),
  check(
    `${name}_on_behalf_name_rule`,
    sql`(${t.onBehalf} = 'other') = (${t.onBehalfName} is not null)`,
  ),
];

const money = (name: string) => integer(name).notNull();

export const donations = sqliteTable(
  'donations',
  {
    ...syncColumns,
    date: text('date').notNull(),
    amountMinor: money('amount_minor'),
    currency: text('currency').notNull(),
    countryCode: text('country_code').notNull(),
    ...recipientColumns,
    ...occasionColumns,
    source: text('source').notNull(),
    recurringRuleId: text('recurring_rule_id'),
    occurrenceMonth: text('occurrence_month'),
    eidPlanId: text('eid_plan_id'),
    eidPersonId: text('eid_person_id'),
    eidPacketGroup: text('eid_packet_group'),
  },
  (t) => [
    check('donations_deleted', flag(t.deleted)),
    check('donations_date', civilDate(t.date)),
    check('donations_amount', sql`${t.amountMinor} > 0`),
    check('donations_currency', isoCode(t.currency, 3)),
    check('donations_country', isoCode(t.countryCode, 2)),
    check('donations_source', oneOf(t.source, DONATION_SOURCES)),
    check('donations_packet_group', nullOrOneOf(t.eidPacketGroup, EID_PACKET_GROUP_KEYS)),
    // Rule and month are set together (spec 7.5).
    check(
      'donations_occurrence_pair',
      sql`(${t.recurringRuleId} is null) = (${t.occurrenceMonth} is null)`,
    ),
    ...recipientChecks('donations', t),
    ...occasionChecks('donations', t),
    index('donations_date_idx').on(t.deleted, t.date),
    index('donations_currency_date_idx').on(t.deleted, t.currency, t.date),
    index('donations_category_date_idx').on(t.deleted, t.category, t.date),
    uniqueIndex('donations_occurrence_uq')
      .on(t.recurringRuleId, t.occurrenceMonth)
      .where(sql`${t.recurringRuleId} is not null`),
    index('donations_eid_packet_idx').on(t.eidPlanId, t.eidPacketGroup),
  ],
);

export const receipts = sqliteTable(
  'receipts',
  {
    ...syncColumns,
    donationId: text('donation_id')
      .notNull()
      .references(() => donations.id),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    width: integer('width'),
    height: integer('height'),
    // Local-only companions: never synced (spec 7.5).
    localPath: text('local_path'),
    uploadState: text('upload_state').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastErrorCode: text('last_error_code'),
  },
  (t) => [
    check('receipts_deleted', flag(t.deleted)),
    check(
      'receipts_file_name',
      sql`length(${t.fileName}) between 1 and ${sql.raw(String(LIMITS.receiptFileName))}`,
    ),
    check(
      'receipts_size',
      sql`${t.sizeBytes} between 1 and ${sql.raw(String(LIMITS.receiptMaxBytes))}`,
    ),
    check('receipts_sha256', sql`length(${t.sha256}) = 64`),
    check(
      'receipts_upload_state',
      oneOf(t.uploadState, ['pending', 'uploading', 'uploaded', 'failed']),
    ),
    index('receipts_donation_idx').on(t.donationId),
  ],
);

export const recurringRules = sqliteTable(
  'recurring_rules',
  {
    ...syncColumns,
    ...recipientColumns,
    ...occasionColumns,
    amountMinor: money('amount_minor'),
    currency: text('currency').notNull(),
    countryCode: text('country_code').notNull(),
    dayOfMonth: integer('day_of_month').notNull(),
    startMonth: text('start_month').notNull(),
    mode: text('mode').notNull(),
    status: text('status').notNull().default('active'),
    resumeFromMonth: text('resume_from_month'),
    backfillDecided: integer('backfill_decided').notNull().default(0),
  },
  (t) => [
    check('rules_deleted', flag(t.deleted)),
    check('rules_amount', sql`${t.amountMinor} > 0`),
    check('rules_currency', isoCode(t.currency, 3)),
    check('rules_country', isoCode(t.countryCode, 2)),
    check('rules_day', sql`${t.dayOfMonth} between 1 and 31`),
    check('rules_start_month', monthKey(t.startMonth)),
    check(
      'rules_resume_month',
      sql`${t.resumeFromMonth} is null or ${monthKey(t.resumeFromMonth)}`,
    ),
    check('rules_mode', oneOf(t.mode, RECURRING_MODES)),
    check('rules_status', oneOf(t.status, RECURRING_STATUSES)),
    check('rules_backfill', flag(t.backfillDecided)),
    check('rules_no_friday', sql`${t.occasion} <> 'friday_prayer'`),
    ...recipientChecks('rules', t),
    ...occasionChecks('rules', t),
    index('rules_status_idx').on(t.deleted, t.status),
  ],
);

export const recurringOccurrences = sqliteTable(
  'recurring_occurrences',
  {
    ...syncColumns,
    ruleId: text('rule_id')
      .notNull()
      .references(() => recurringRules.id),
    month: text('month').notNull(),
    dueDate: text('due_date').notNull(),
    status: text('status').notNull(),
    amountMinor: money('amount_minor'),
    currency: text('currency').notNull(),
    donationId: text('donation_id').references(() => donations.id),
  },
  (t) => [
    check('occurrences_deleted', flag(t.deleted)),
    check('occurrences_month', monthKey(t.month)),
    check('occurrences_due_date', civilDate(t.dueDate)),
    check('occurrences_status', oneOf(t.status, OCCURRENCE_STATUSES)),
    check('occurrences_amount', sql`${t.amountMinor} > 0`),
    check('occurrences_currency', isoCode(t.currency, 3)),
    // One occurrence per rule per month (spec 7.3, deterministic IDs).
    uniqueIndex('occurrences_rule_month_uq').on(t.ruleId, t.month),
    index('occurrences_status_idx').on(t.deleted, t.status, t.dueDate),
  ],
);

export const reminders = sqliteTable(
  'reminders',
  {
    ...syncColumns,
    label: text('label').notNull(),
    monthDay: text('month_day').notNull(),
    occasion: text('occasion').notNull(),
    ...recipientColumns,
    lastAmountMinor: integer('last_amount_minor'),
    lastCurrency: text('last_currency'),
    lastDate: text('last_date'),
    sourceDonationId: text('source_donation_id'),
  },
  (t) => [
    check('reminders_deleted', flag(t.deleted)),
    check(
      'reminders_label',
      sql`length(${t.label}) between 1 and ${sql.raw(String(LIMITS.reminderLabel))}`,
    ),
    check('reminders_month_day', sql`${t.monthDay} glob '[0-1][0-9]-[0-3][0-9]'`),
    check('reminders_occasion', oneOf(t.occasion, OCCASIONS)),
    check('reminders_last_amount', sql`${t.lastAmountMinor} is null or ${t.lastAmountMinor} > 0`),
    check(
      'reminders_last_currency',
      sql`${t.lastCurrency} is null or ${isoCode(t.lastCurrency, 3)}`,
    ),
    check('reminders_last_date', nullOrCivilDate(t.lastDate)),
    ...recipientChecks('reminders', t),
    index('reminders_month_day_idx').on(t.deleted, t.monthDay),
  ],
);

export const eidPlans = sqliteTable(
  'eid_plans',
  {
    ...syncColumns,
    year: integer('year').notNull(),
    budgetMinor: integer('budget_minor').notNull(),
    currency: text('currency').notNull(),
  },
  (t) => [
    check('eid_plans_deleted', flag(t.deleted)),
    check('eid_plans_year', sql`${t.year} between 1900 and 9999`),
    check('eid_plans_budget', sql`${t.budgetMinor} >= 0`),
    check('eid_plans_currency', isoCode(t.currency, 3)),
    uniqueIndex('eid_plans_year_uq').on(t.year),
  ],
);

export const eidPeople = sqliteTable(
  'eid_people',
  {
    ...syncColumns,
    planId: text('plan_id')
      .notNull()
      .references(() => eidPlans.id),
    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    relationshipSide: text('relationship_side'),
    relationshipLine: text('relationship_line'),
    group: text('group').notNull(),
    amountMinor: money('amount_minor'),
    donationId: text('donation_id').references(() => donations.id),
  },
  (t) => [
    check('eid_people_deleted', flag(t.deleted)),
    check(
      'eid_people_name',
      sql`length(${t.name}) between 1 and ${sql.raw(String(LIMITS.eidPersonName))}`,
    ),
    // Stranger is not offered in the Eid Planner (R-EID-04).
    check(
      'eid_people_relationship',
      sql`${oneOf(t.relationship, RELATIONSHIPS)} and ${t.relationship} <> 'stranger'`,
    ),
    check('eid_people_side', nullOrOneOf(t.relationshipSide, RELATIONSHIP_SIDES)),
    check('eid_people_line', nullOrOneOf(t.relationshipLine, RELATIONSHIP_LINES)),
    check('eid_people_group', oneOf(t.group, EID_PERSON_GROUPS)),
    check('eid_people_amount', sql`${t.amountMinor} > 0`),
    index('eid_people_plan_idx').on(t.planId, t.deleted),
  ],
);

export const eidPacketGroups = sqliteTable(
  'eid_packet_groups',
  {
    ...syncColumns,
    planId: text('plan_id')
      .notNull()
      .references(() => eidPlans.id),
    groupKey: text('group_key').notNull(),
    count: integer('count').notNull(),
    amountEachMinor: integer('amount_each_minor').notNull(),
  },
  (t) => [
    check('eid_packets_deleted', flag(t.deleted)),
    check('eid_packets_group', oneOf(t.groupKey, EID_PACKET_GROUP_KEYS)),
    check(
      'eid_packets_count',
      sql`${t.count} between 0 and ${sql.raw(String(LIMITS.packetCountMax))}`,
    ),
    check('eid_packets_amount', sql`${t.amountEachMinor} >= 0`),
    uniqueIndex('eid_packets_plan_group_uq').on(t.planId, t.groupKey),
  ],
);

/** Singleton: the id is fixed (spec 7.3). */
export const budget = sqliteTable(
  'budget',
  {
    ...syncColumns,
    monthlyAmountMinor: integer('monthly_amount_minor').notNull(),
    currency: text('currency').notNull(),
  },
  (t) => [
    check('budget_singleton', sql`${t.id} = 'budget'`),
    check('budget_deleted', flag(t.deleted)),
    check('budget_amount', sql`${t.monthlyAmountMinor} >= 0`),
    check('budget_currency', isoCode(t.currency, 3)),
  ],
);

export const profile = sqliteTable(
  'profile',
  {
    ...syncColumns,
    name: text('name').notNull().default(''),
    maritalStatus: text('marital_status'),
    homeCountryCode: text('home_country_code').notNull(),
    homeCurrency: text('home_currency').notNull(),
    hijriAdjust: integer('hijri_adjust').notNull().default(0),
    fridayReminder: integer('friday_reminder').notNull().default(0),
    fridayDismissedDate: text('friday_dismissed_date'),
    welcomeSeen: integer('welcome_seen').notNull().default(0),
  },
  (t) => [
    check('profile_singleton', sql`${t.id} = 'profile'`),
    check('profile_deleted', flag(t.deleted)),
    check('profile_name', sql`length(${t.name}) <= ${sql.raw(String(LIMITS.profileName))}`),
    check('profile_marital', nullOrOneOf(t.maritalStatus, MARITAL_STATUSES)),
    check('profile_country', isoCode(t.homeCountryCode, 2)),
    check('profile_currency', isoCode(t.homeCurrency, 3)),
    check('profile_hijri', oneOf(t.hijriAdjust, HIJRI_ADJUSTMENTS)),
    check('profile_friday', flag(t.fridayReminder)),
    check('profile_friday_dismissed', nullOrCivilDate(t.fridayDismissedDate)),
    check('profile_welcome', flag(t.welcomeSeen)),
  ],
);

export const promptState = sqliteTable(
  'prompt_state',
  {
    ...syncColumns,
    timesAsked: integer('times_asked').notNull().default(0),
    lastAskedAt: text('last_asked_at'),
  },
  (t) => [
    check('prompt_singleton', sql`${t.id} = 'prompt_state'`),
    check('prompt_deleted', flag(t.deleted)),
    check('prompt_times', sql`${t.timesAsked} between 0 and 2`),
  ],
);
