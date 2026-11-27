import type { MaritalStatus, Relationship, RelationshipLine, RelationshipSide } from './codes.js';
import { RELATIONSHIPS } from './codes.js';

/** R-REL-02: "Whose family?" applies to these relationships, for married users only. */
const USES_SIDE: ReadonlySet<Relationship> = new Set<Relationship>([
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
]);

/** R-REL-03: "Which side?" (paternal or maternal) applies to these relationships. */
const USES_LINE: ReadonlySet<Relationship> = new Set<Relationship>([
  'grandparents',
  'uncle',
  'aunt',
  'cousins',
  'distant_relative',
]);

export const relationshipUsesSide = (relationship: Relationship): boolean =>
  USES_SIDE.has(relationship);
export const relationshipUsesLine = (relationship: Relationship): boolean =>
  USES_LINE.has(relationship);

/**
 * R-REL-01: single users never see Spouse, "Spouse's side" or in-law labels. An unset status is
 * treated as single, so nothing spouse-related shows until the person says they are married.
 */
export const isMarried = (status: MaritalStatus | null): boolean => status === 'married';

export function availableRelationships(status: MaritalStatus | null): Relationship[] {
  return RELATIONSHIPS.filter((relationship) => relationship !== 'spouse' || isMarried(status));
}

export function availableSides(status: MaritalStatus | null): RelationshipSide[] {
  return isMarried(status) ? ['mine', 'spouse'] : ['mine'];
}

export type InLawLabel = 'father_in_law' | 'mother_in_law' | 'parents_in_law' | 'siblings_in_law';

export interface RelationshipLabel {
  /** The i18n key: the relationship code, or an in-law key. */
  readonly base: Relationship | InLawLabel;
  /** Shown in brackets after the base, e.g. "Uncle (maternal, spouse's side)". */
  readonly qualifiers: readonly ('paternal' | 'maternal' | 'spouse_side')[];
}

const IN_LAW: Partial<Record<Relationship, InLawLabel>> = {
  father: 'father_in_law',
  mother: 'mother_in_law',
  both_parents: 'parents_in_law',
  siblings: 'siblings_in_law',
};

/**
 * R-REL-04: spouse's side with father, mother, both parents or siblings is an in-law label.
 * Otherwise the label is the relationship plus qualifiers: the line first, then spouse's side.
 */
export function relationshipLabel(
  relationship: Relationship,
  side: RelationshipSide | null,
  line: RelationshipLine | null,
): RelationshipLabel {
  const inLaw = side === 'spouse' ? IN_LAW[relationship] : undefined;
  if (inLaw !== undefined) return { base: inLaw, qualifiers: [] };
  const qualifiers: ('paternal' | 'maternal' | 'spouse_side')[] = [];
  if (line !== null) qualifiers.push(line);
  if (side === 'spouse') qualifiers.push('spouse_side');
  return { base: relationship, qualifiers };
}
