/**
 * Spec 7.4: the app stores stable codes, never display labels. Labels are rendered through i18n.
 * This file is the single vocabulary; the zod schemas and the database both build on it.
 */
export const CATEGORIES = ['individual', 'mosque', 'charity'] as const;
export type Category = (typeof CATEGORIES)[number];

export const RELATIONSHIPS = [
  'father',
  'mother',
  'both_parents',
  'spouse',
  'kids',
  'siblings',
  'grandparents',
  'uncle',
  'aunt',
  'cousins',
  'nephew',
  'niece',
  'distant_relative',
  'friends',
  'stranger',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

/** "Whose family?" (R-REL-02). */
export const RELATIONSHIP_SIDES = ['mine', 'spouse'] as const;
export type RelationshipSide = (typeof RELATIONSHIP_SIDES)[number];

/** "Which side?" (R-REL-03). */
export const RELATIONSHIP_LINES = ['paternal', 'maternal'] as const;
export type RelationshipLine = (typeof RELATIONSHIP_LINES)[number];

/** Occasions grouped as the Log form shows them (spec 10.1). */
export const OCCASION_GROUPS = {
  life_events: [
    'newborn',
    'cukur_rambut',
    'visiting_sick',
    'death_funeral',
    'birthday',
    'anniversary',
    'wedding',
    'umrah_haj_send_off',
  ],
  doa_gatherings: ['doa_selamat', 'doa_tahlil'],
  prayers: ['friday_prayer', 'subuh', 'zohor', 'asar', 'maghrib', 'isyak', 'tarawih', 'eid_prayer'],
  islamic_dates: [
    'ramadan',
    'laylatul_qadr',
    'eid_al_fitr',
    'day_of_arafah',
    'eid_al_adha',
    'awal_muharram',
    'ashura',
    'mawlid_nabi',
    'isra_miraj',
    'nisfu_syaban',
  ],
  other: ['none', 'appeal_emergency', 'other'],
} as const;

export const OCCASIONS = [
  ...OCCASION_GROUPS.life_events,
  ...OCCASION_GROUPS.doa_gatherings,
  ...OCCASION_GROUPS.prayers,
  ...OCCASION_GROUPS.islamic_dates,
  ...OCCASION_GROUPS.other,
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const GIVING_TYPES = [
  'sadaqah',
  'zakat_fitrah',
  'zakat_harta',
  'infaq',
  'wakaf',
  'fidyah',
  'eid_money',
  'hadiah',
  'other',
] as const;
export type GivingType = (typeof GIVING_TYPES)[number];

export const ON_BEHALF = ['self', 'late_father', 'late_mother', 'late_parents', 'other'] as const;
export type OnBehalf = (typeof ON_BEHALF)[number];

/** Where a donation came from (spec 7.4). */
export const DONATION_SOURCES = [
  'manual',
  'recurring',
  'eid_person',
  'eid_packet',
  'repeat_friday',
  'reminder',
] as const;
export type DonationSource = (typeof DONATION_SOURCES)[number];

export const MARITAL_STATUSES = ['single', 'married'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const RECURRING_MODES = ['auto', 'confirm'] as const;
export type RecurringMode = (typeof RECURRING_MODES)[number];

export const RECURRING_STATUSES = ['active', 'paused', 'stopped'] as const;
export type RecurringStatus = (typeof RECURRING_STATUSES)[number];

export const OCCURRENCE_STATUSES = ['pending', 'logged', 'declined', 'skipped'] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

export const EID_PERSON_GROUPS = ['kids', 'families', 'others'] as const;
export type EidPersonGroup = (typeof EID_PERSON_GROUPS)[number];

export const EID_PACKET_GROUP_KEYS = ['kids', 'elderly'] as const;
export type EidPacketGroupKey = (typeof EID_PACKET_GROUP_KEYS)[number];

export const HIJRI_ADJUSTMENTS = [-1, 0, 1] as const;
