import {
  CATEGORIES,
  type Category,
  GIVING_TYPES,
  OCCASIONS,
  ON_BEHALF,
  RELATIONSHIPS,
  RELATIONSHIP_LINES,
  RELATIONSHIP_SIDES,
  isMarried,
  relationshipUsesLine,
  relationshipUsesSide,
  type CivilDate,
  type MaritalStatus,
  type Relationship,
  type RelationshipLine,
  type RelationshipSide,
} from '@muslim-give/domain';
import { z } from 'zod';
import { addIssue } from './checks.js';
import { LIMITS } from './limits.js';
import {
  boundedText,
  civilDateSchema,
  countryCodeSchema,
  currencySchema,
  idSchema,
  positiveAmountMinorSchema,
} from './primitives.js';

/**
 * What a gift is, apart from when and where it happened: shared by single donations, monthly
 * giving rules and yearly reminders (spec 7.5 "recipient fields").
 */
export const donationDescriptionShape = {
  category: z.enum(CATEGORIES),
  recipientName: boundedText(LIMITS.recipientName, 'donation.name_too_long').nullable(),
  recipientRefId: idSchema.nullable(),
  relationship: z.enum(RELATIONSHIPS).nullable(),
  relationshipSide: z.enum(RELATIONSHIP_SIDES).nullable(),
  relationshipLine: z.enum(RELATIONSHIP_LINES).nullable(),
  occasion: z.enum(OCCASIONS),
  occasionOther: boundedText(LIMITS.occasionOther, 'donation.occasion_other_too_long').nullable(),
  givingType: z.enum(GIVING_TYPES),
  onBehalf: z.enum(ON_BEHALF),
  onBehalfName: boundedText(LIMITS.onBehalfName, 'donation.behalf_name_too_long').nullable(),
  note: boundedText(LIMITS.note, 'donation.note_too_long').nullable(),
} as const;

const descriptionObject = z.strictObject(donationDescriptionShape);
export type DonationDescription = z.infer<typeof descriptionObject>;

/** The relationship selectors, shared by donations, reminders and Eid people (R-REL). */
export interface RelationshipFacts {
  readonly relationship: Relationship | null;
  readonly relationshipSide: RelationshipSide | null;
  readonly relationshipLine: RelationshipLine | null;
}

/**
 * R-REL-01 to 03: side and line only where they apply, and nothing spouse-related for a user who
 * is not married. `maritalStatus` comes from the profile.
 */
export function checkRelationshipFacts(
  ctx: z.core.ParsePayload<RelationshipFacts>,
  maritalStatus: MaritalStatus | null,
): void {
  const v = ctx.value;
  if (v.relationship !== null) {
    if (v.relationshipSide !== null && !relationshipUsesSide(v.relationship)) {
      addIssue(ctx, 'relationshipSide', 'donation.side_not_applicable');
    }
    if (v.relationshipLine !== null && !relationshipUsesLine(v.relationship)) {
      addIssue(ctx, 'relationshipLine', 'donation.line_not_applicable');
    }
  } else {
    if (v.relationshipSide !== null)
      addIssue(ctx, 'relationshipSide', 'donation.side_not_applicable');
    if (v.relationshipLine !== null)
      addIssue(ctx, 'relationshipLine', 'donation.line_not_applicable');
  }
  if (
    !isMarried(maritalStatus) &&
    (v.relationship === 'spouse' || v.relationshipSide === 'spouse')
  ) {
    addIssue(ctx, 'relationship', 'donation.spouse_not_available');
  }
}

/** Who a gift went to: category rules from spec 10.1 plus the relationship rules. */
export interface RecipientFacts extends RelationshipFacts {
  readonly category: Category;
  readonly recipientName: string | null;
}

export function checkRecipientFacts(
  ctx: z.core.ParsePayload<RecipientFacts>,
  maritalStatus: MaritalStatus | null,
): void {
  const v = ctx.value;
  if (v.category === 'mosque' && v.recipientName === null) {
    addIssue(ctx, 'recipientName', 'donation.mosque_required');
  }
  if (v.category === 'charity' && v.recipientName === null) {
    addIssue(ctx, 'recipientName', 'donation.charity_name_required');
  }
  if (v.category === 'individual') {
    if (v.relationship === null) addIssue(ctx, 'relationship', 'donation.relationship_required');
    if (v.recipientName !== null && v.recipientName.length > LIMITS.individualName) {
      addIssue(ctx, 'recipientName', 'donation.name_too_long');
    }
  } else if (
    v.relationship !== null ||
    v.relationshipSide !== null ||
    v.relationshipLine !== null
  ) {
    addIssue(ctx, 'relationship', 'donation.individual_fields_only');
  }
  checkRelationshipFacts(ctx, maritalStatus);
}

/** Cross-field rules for a whole description: recipient, occasion and on-behalf (spec 10.1). */
export function checkDonationDescription(
  ctx: z.core.ParsePayload<DonationDescription>,
  maritalStatus: MaritalStatus | null,
): void {
  const v = ctx.value;
  checkRecipientFacts(ctx, maritalStatus);
  if (v.occasionOther !== null && v.occasion !== 'other') {
    addIssue(ctx, 'occasionOther', 'donation.occasion_other_not_applicable');
  }
  if (v.onBehalf === 'other' && v.onBehalfName === null) {
    addIssue(ctx, 'onBehalfName', 'donation.behalf_name_required');
  }
  if (v.onBehalf !== 'other' && v.onBehalfName !== null) {
    addIssue(ctx, 'onBehalfName', 'donation.behalf_name_not_applicable');
  }
}

export interface DonationRules {
  /** "Today" on the device, as a civil date: a donation cannot be dated after it (spec 10.1). */
  readonly today: CivilDate;
  readonly maritalStatus: MaritalStatus | null;
}

/** What a person can create from the Log form. Eid and monthly sources have their own commands. */
export const USER_DONATION_SOURCES = ['manual', 'repeat_friday', 'reminder'] as const;

/** Validation for the Log Donation form, as a function of today and the profile (spec 10.1). */
export function createDonationInputSchema(rules: DonationRules) {
  return z
    .strictObject({
      ...donationDescriptionShape,
      date: civilDateSchema,
      amountMinor: positiveAmountMinorSchema,
      currency: currencySchema,
      countryCode: countryCodeSchema,
      source: z.enum(USER_DONATION_SOURCES),
    })
    .check((ctx) => {
      if (ctx.value.date > rules.today) addIssue(ctx, 'date', 'donation.date_in_future');
      checkDonationDescription(ctx, rules.maritalStatus);
    });
}

export type DonationInput = z.infer<ReturnType<typeof createDonationInputSchema>>;
