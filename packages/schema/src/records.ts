import {
  EID_PACKET_GROUP_KEYS,
  EID_PERSON_GROUPS,
  MARITAL_STATUSES,
  RECURRING_MODES,
  RELATIONSHIPS,
  RELATIONSHIP_LINES,
  RELATIONSHIP_SIDES,
  OCCASIONS,
  monthKeyOf,
  type CivilDate,
  type MaritalStatus,
} from '@muslim-give/domain';
import { z } from 'zod';
import { addIssue } from './checks.js';
import {
  checkDonationDescription,
  checkRecipientFacts,
  checkRelationshipFacts,
  donationDescriptionShape,
} from './donation.js';
import { LIMITS } from './limits.js';
import {
  boundedText,
  civilDateSchema,
  countryCodeSchema,
  currencySchema,
  idSchema,
  instantSchema,
  monthDaySchema,
  monthKeySchema,
  nonNegativeAmountMinorSchema,
  positiveAmountMinorSchema,
} from './primitives.js';

/** Spec 7.5 `budget` singleton. 0 means no budget (R-BUD-01). */
export const budgetSchema = z.strictObject({
  monthlyAmountMinor: nonNegativeAmountMinorSchema,
  currency: currencySchema,
});

/** Spec 7.5 `profile` singleton. */
export const profileSchema = z.strictObject({
  name: z.string().trim().max(LIMITS.profileName, 'profile.name_too_long'),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  homeCountryCode: countryCodeSchema,
  homeCurrency: currencySchema,
  hijriAdjust: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  fridayReminder: z.boolean(),
  fridayDismissedDate: civilDateSchema.nullable(),
  welcomeSeen: z.boolean(),
});

/** Spec 7.5 `prompt_state` singleton (spec 9.2). */
export const promptStateSchema = z.strictObject({
  timesAsked: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  lastAskedAt: instantSchema.nullable(),
});

export interface RecurringRules {
  readonly today: CivilDate;
  readonly maritalStatus: MaritalStatus | null;
}

/** Monthly giving rule from the Log form (R-REC-01). */
export function createRecurringRuleInputSchema(rules: RecurringRules) {
  return z
    .strictObject({
      ...donationDescriptionShape,
      amountMinor: positiveAmountMinorSchema,
      currency: currencySchema,
      countryCode: countryCodeSchema,
      dayOfMonth: z
        .number()
        .int('recurring.invalid_day')
        .min(1, 'recurring.invalid_day')
        .max(31, 'recurring.invalid_day'),
      startMonth: monthKeySchema,
      mode: z.enum(RECURRING_MODES),
    })
    .check((ctx) => {
      if (ctx.value.startMonth > monthKeyOf(rules.today)) {
        addIssue(ctx, 'startMonth', 'recurring.start_in_future');
      }
      // The Log form resets a Friday-prayer occasion for monthly giving (spec 10.1).
      if (ctx.value.occasion === 'friday_prayer') {
        addIssue(ctx, 'occasion', 'recurring.friday_prayer_not_allowed');
      }
      checkDonationDescription(ctx, rules.maritalStatus);
    });
}

/** Yearly reminder (R-YR-01). */
export function createReminderInputSchema(maritalStatus: MaritalStatus | null) {
  return z
    .strictObject({
      label: boundedText(LIMITS.reminderLabel, 'reminder.label_too_long'),
      monthDay: monthDaySchema,
      occasion: z.enum(OCCASIONS),
      category: donationDescriptionShape.category,
      recipientName: donationDescriptionShape.recipientName,
      recipientRefId: donationDescriptionShape.recipientRefId,
      relationship: donationDescriptionShape.relationship,
      relationshipSide: donationDescriptionShape.relationshipSide,
      relationshipLine: donationDescriptionShape.relationshipLine,
      lastAmountMinor: positiveAmountMinorSchema,
      lastCurrency: currencySchema,
      lastDate: civilDateSchema,
      sourceDonationId: idSchema.nullable(),
    })
    .check((ctx) => {
      checkRecipientFacts(ctx, maritalStatus);
    });
}

/** One plan per Eid year (R-EID, spec 10.8). */
export const eidPlanSchema = z.strictObject({
  year: z
    .number()
    .int('eid.invalid_year')
    .min(1900, 'eid.invalid_year')
    .max(9999, 'eid.invalid_year'),
  budgetMinor: nonNegativeAmountMinorSchema,
  currency: currencySchema,
});

/** A person in the Eid plan (R-EID-04): Stranger is excluded; single users get no spouse options. */
export function createEidPersonInputSchema(maritalStatus: MaritalStatus | null) {
  return z
    .strictObject({
      planId: idSchema,
      name: boundedText(LIMITS.eidPersonName, 'eid.name_too_long'),
      relationship: z
        .enum(RELATIONSHIPS)
        .refine((value) => value !== 'stranger', 'eid.stranger_not_allowed'),
      relationshipSide: z.enum(RELATIONSHIP_SIDES).nullable(),
      relationshipLine: z.enum(RELATIONSHIP_LINES).nullable(),
      group: z.enum(EID_PERSON_GROUPS),
      amountMinor: positiveAmountMinorSchema,
    })
    .check((ctx) => {
      checkRelationshipFacts(ctx, maritalStatus);
    });
}

/** "People I may meet": packets to prepare and the amount each (R-EID-07). */
export const eidPacketGroupSchema = z.strictObject({
  planId: idSchema,
  groupKey: z.enum(EID_PACKET_GROUP_KEYS),
  count: z
    .number()
    .int('eid.invalid_count')
    .min(0, 'eid.invalid_count')
    .max(LIMITS.packetCountMax, 'eid.invalid_count'),
  amountEachMinor: nonNegativeAmountMinorSchema,
});
