import { OCCASIONS, OCCASION_GROUPS, RELATIONSHIPS } from './codes.js';
import {
  availableRelationships,
  availableSides,
  isMarried,
  relationshipLabel,
  relationshipUsesLine,
  relationshipUsesSide,
} from './relationship.js';

describe('spec 7.4 stable codes', () => {
  it('has the 15 relationships and 31 occasions from the prototype, without duplicates', () => {
    expect(RELATIONSHIPS).toHaveLength(15);
    expect(OCCASIONS).toHaveLength(31);
    expect(new Set(OCCASIONS).size).toBe(OCCASIONS.length);
    expect(OCCASION_GROUPS.prayers).toContain('friday_prayer');
  });
});

describe('R-REL-01 single users never see spouse options', () => {
  it('hides Spouse unless married', () => {
    expect(availableRelationships('single')).toHaveLength(14);
    expect(availableRelationships(null)).not.toContain('spouse');
    expect(availableRelationships('single')).not.toContain('spouse');
    expect(availableRelationships('married')).toContain('spouse');
    expect(availableRelationships('married')).toHaveLength(15);
  });
  it('offers the spouse side only to married users', () => {
    expect(availableSides('single')).toEqual(['mine']);
    expect(availableSides(null)).toEqual(['mine']);
    expect(availableSides('married')).toEqual(['mine', 'spouse']);
    expect(isMarried('married')).toBe(true);
    expect(isMarried(null)).toBe(false);
  });
});

describe('R-REL-02 and R-REL-03 which selectors apply', () => {
  it('asks whose family for parents, siblings and extended family', () => {
    for (const r of [
      'father',
      'mother',
      'both_parents',
      'siblings',
      'grandparents',
      'uncle',
      'aunt',
      'cousins',
      'nephew',
      'niece',
      'distant_relative',
    ] as const) {
      expect(relationshipUsesSide(r)).toBe(true);
    }
    for (const r of ['spouse', 'kids', 'friends', 'stranger'] as const) {
      expect(relationshipUsesSide(r)).toBe(false);
    }
  });
  it('asks paternal or maternal only for grandparents, uncle, aunt, cousins and distant relatives', () => {
    for (const r of ['grandparents', 'uncle', 'aunt', 'cousins', 'distant_relative'] as const) {
      expect(relationshipUsesLine(r)).toBe(true);
    }
    for (const r of ['father', 'siblings', 'nephew', 'niece', 'kids'] as const) {
      expect(relationshipUsesLine(r)).toBe(false);
    }
  });
});

describe('R-REL-04 labels', () => {
  it('uses in-law labels for the spouse side of parents and siblings', () => {
    expect(relationshipLabel('father', 'spouse', null)).toEqual({
      base: 'father_in_law',
      qualifiers: [],
    });
    expect(relationshipLabel('mother', 'spouse', null).base).toBe('mother_in_law');
    expect(relationshipLabel('both_parents', 'spouse', null).base).toBe('parents_in_law');
    expect(relationshipLabel('siblings', 'spouse', null).base).toBe('siblings_in_law');
  });
  it('adds qualifiers in brackets otherwise, line first then spouse side', () => {
    expect(relationshipLabel('uncle', 'spouse', 'maternal')).toEqual({
      base: 'uncle',
      qualifiers: ['maternal', 'spouse_side'],
    });
    expect(relationshipLabel('aunt', 'mine', 'paternal')).toEqual({
      base: 'aunt',
      qualifiers: ['paternal'],
    });
    expect(relationshipLabel('nephew', 'spouse', null)).toEqual({
      base: 'nephew',
      qualifiers: ['spouse_side'],
    });
  });
  it('has no qualifiers for plain relationships', () => {
    expect(relationshipLabel('friends', null, null)).toEqual({ base: 'friends', qualifiers: [] });
    expect(relationshipLabel('father', 'mine', null)).toEqual({ base: 'father', qualifiers: [] });
  });
});
