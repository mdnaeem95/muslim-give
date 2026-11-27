import type { MaritalStatus } from '@muslim-give/domain';
import { createDonationInputSchema, type DonationInput } from './donation.js';
import { day, issuesOf } from './test-support.js';

const today = day('2027-03-05');
const parse = (input: object, maritalStatus: MaritalStatus | null = 'married') =>
  createDonationInputSchema({ today, maritalStatus }).safeParse({ ...base, ...input });

const base = {
  date: '2027-03-05',
  amountMinor: 1250,
  currency: 'SGD',
  countryCode: 'SG',
  category: 'individual',
  recipientName: 'Aisyah',
  recipientRefId: null,
  relationship: 'kids',
  relationshipSide: null,
  relationshipLine: null,
  occasion: 'birthday',
  occasionOther: null,
  givingType: 'hadiah',
  onBehalf: 'self',
  onBehalfName: null,
  note: null,
  source: 'manual',
};

describe('spec 10.1 Log Donation validation', () => {
  it('accepts a complete individual gift and trims text', () => {
    const result = parse({ recipientName: '  Aisyah  ' });
    expect(result.success).toBe(true);
    const data: DonationInput | undefined = result.data;
    expect(data?.recipientName).toBe('Aisyah');
  });
  it('rejects unknown fields', () => {
    expect(parse({ surprise: 1 }).success).toBe(false);
  });
  it('cannot be dated in the future, but today is fine', () => {
    expect(issuesOf(parse({ date: '2027-03-06' }))).toEqual(['date:donation.date_in_future']);
    expect(parse({ date: '2027-03-05' }).success).toBe(true);
    expect(parse({ date: '2020-01-01' }).success).toBe(true);
    expect(issuesOf(parse({ date: '2027-02-30' }))).toEqual(['date:date.invalid']);
  });
  it('checks amount, currency and country', () => {
    expect(parse({ amountMinor: 0 }).success).toBe(false);
    expect(parse({ amountMinor: 12.5 }).success).toBe(false);
    expect(parse({ currency: 'sgd' }).success).toBe(false);
    expect(parse({ countryCode: 'SGP' }).success).toBe(false);
  });
  it('only lets a person create manual, repeat and reminder gifts', () => {
    expect(parse({ source: 'reminder' }).success).toBe(true);
    expect(parse({ source: 'repeat_friday' }).success).toBe(true);
    expect(parse({ source: 'eid_person' }).success).toBe(false);
  });
});

describe('recipient rules', () => {
  const mosque = { category: 'mosque', relationship: null, recipientName: 'Masjid Sultan' };
  it('requires a mosque name and a charity name', () => {
    expect(parse(mosque).success).toBe(true);
    expect(issuesOf(parse({ ...mosque, recipientName: null }))).toEqual([
      'recipientName:donation.mosque_required',
    ]);
    const charity = { category: 'charity', relationship: null, recipientName: 'Jamiyah' };
    expect(parse(charity).success).toBe(true);
    expect(issuesOf(parse({ ...charity, recipientName: null }))).toEqual([
      'recipientName:donation.charity_name_required',
    ]);
  });
  it('requires a relationship for an individual, with an optional name', () => {
    expect(issuesOf(parse({ relationship: null }))).toEqual([
      'relationship:donation.relationship_required',
    ]);
    expect(parse({ recipientName: null }).success).toBe(true);
  });
  it('limits an individuals name to 40 characters, any recipient to 80', () => {
    expect(parse({ recipientName: 'a'.repeat(40) }).success).toBe(true);
    expect(issuesOf(parse({ recipientName: 'a'.repeat(41) }))).toEqual([
      'recipientName:donation.name_too_long',
    ]);
    expect(parse({ ...mosque, recipientName: 'a'.repeat(80) }).success).toBe(true);
    expect(parse({ ...mosque, recipientName: 'a'.repeat(81) }).success).toBe(false);
    expect(parse({ recipientName: '   ' }).success).toBe(false);
  });
  it('keeps relationship fields for individuals only', () => {
    expect(issuesOf(parse({ ...mosque, relationship: 'kids' }))).toEqual([
      'relationship:donation.individual_fields_only',
    ]);
    expect(issuesOf(parse({ ...mosque, relationshipSide: 'mine' }))).toEqual(
      [
        'relationshipSide:donation.side_not_applicable',
        'relationship:donation.individual_fields_only',
      ].sort(),
    );
    expect(issuesOf(parse({ ...mosque, relationshipLine: 'paternal' }))).toEqual(
      [
        'relationshipLine:donation.line_not_applicable',
        'relationship:donation.individual_fields_only',
      ].sort(),
    );
  });
});

describe('R-REL relationship selectors', () => {
  it('allows whose-family and which-side only where they apply', () => {
    expect(
      parse({ relationship: 'uncle', relationshipSide: 'mine', relationshipLine: 'maternal' })
        .success,
    ).toBe(true);
    expect(parse({ relationship: 'father', relationshipSide: 'mine' }).success).toBe(true);
    expect(issuesOf(parse({ relationship: 'kids', relationshipSide: 'mine' }))).toEqual([
      'relationshipSide:donation.side_not_applicable',
    ]);
    expect(issuesOf(parse({ relationship: 'father', relationshipLine: 'paternal' }))).toEqual([
      'relationshipLine:donation.line_not_applicable',
    ]);
  });
  it('R-REL-01 hides spouse options from single and unset users', () => {
    expect(issuesOf(parse({ relationship: 'spouse' }, 'single'))).toEqual([
      'relationship:donation.spouse_not_available',
    ]);
    expect(issuesOf(parse({ relationship: 'spouse' }, null))).toEqual([
      'relationship:donation.spouse_not_available',
    ]);
    expect(
      issuesOf(parse({ relationship: 'father', relationshipSide: 'spouse' }, 'single')),
    ).toEqual(['relationship:donation.spouse_not_available']);
    expect(parse({ relationship: 'father', relationshipSide: 'mine' }, 'single').success).toBe(
      true,
    );
    expect(parse({ relationship: 'spouse' }, 'married').success).toBe(true);
    expect(parse({ relationship: 'father', relationshipSide: 'spouse' }, 'married').success).toBe(
      true,
    );
  });
});

describe('occasion and on-behalf rules', () => {
  it('allows free-text occasion only for Others', () => {
    expect(parse({ occasion: 'other', occasionOther: 'School fundraiser' }).success).toBe(true);
    expect(parse({ occasion: 'other', occasionOther: null }).success).toBe(true);
    expect(issuesOf(parse({ occasionOther: 'x' }))).toEqual([
      'occasionOther:donation.occasion_other_not_applicable',
    ]);
    expect(parse({ occasion: 'other', occasionOther: 'a'.repeat(61) }).success).toBe(false);
  });
  it('requires a name when giving on behalf of Others, and only then', () => {
    expect(issuesOf(parse({ onBehalf: 'other' }))).toEqual([
      'onBehalfName:donation.behalf_name_required',
    ]);
    expect(parse({ onBehalf: 'other', onBehalfName: 'Arwah Tok Wan' }).success).toBe(true);
    expect(issuesOf(parse({ onBehalf: 'late_father', onBehalfName: 'x' }))).toEqual([
      'onBehalfName:donation.behalf_name_not_applicable',
    ]);
    expect(parse({ onBehalf: 'late_parents' }).success).toBe(true);
    expect(parse({ onBehalf: 'other', onBehalfName: 'a'.repeat(61) }).success).toBe(false);
  });
  it('limits the note to 120 characters', () => {
    expect(parse({ note: 'a'.repeat(120) }).success).toBe(true);
    expect(parse({ note: 'a'.repeat(121) }).success).toBe(false);
  });
});
