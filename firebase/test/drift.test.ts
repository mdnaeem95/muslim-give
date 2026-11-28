import {
  CATEGORIES,
  DONATION_SOURCES,
  EID_PACKET_GROUP_KEYS,
  EID_PERSON_GROUPS,
  GIVING_TYPES,
  MARITAL_STATUSES,
  OCCASIONS,
  OCCURRENCE_STATUSES,
  ON_BEHALF,
  RECURRING_MODES,
  RECURRING_STATUSES,
  RELATIONSHIPS,
  RELATIONSHIP_LINES,
  RELATIONSHIP_SIDES,
} from '@muslim-give/domain';
import { firestoreRules, storageRules } from './rules-files.js';

/** Each code list in firestore.rules, with the list in the domain it must equal. */
const CODE_LISTS: Readonly<Record<string, readonly string[]>> = {
  categories: CATEGORIES,
  relationships: RELATIONSHIPS,
  sides: RELATIONSHIP_SIDES,
  lines: RELATIONSHIP_LINES,
  occasions: OCCASIONS,
  givingTypes: GIVING_TYPES,
  onBehalf: ON_BEHALF,
  sources: DONATION_SOURCES,
  maritalStatuses: MARITAL_STATUSES,
  modes: RECURRING_MODES,
  ruleStatuses: RECURRING_STATUSES,
  occurrenceStatuses: OCCURRENCE_STATUSES,
  personGroups: EID_PERSON_GROUPS,
  packetKeys: EID_PACKET_GROUP_KEYS,
};

function listInRules(name: string): string[] | null {
  const found = new RegExp(`function ${name}\\(\\) \\{ return \\[(.*?)\\]; \\}`).exec(
    firestoreRules,
  );
  if (found?.[1] === undefined) return null;
  return [...found[1].matchAll(/'([^']+)'/g)].map((match) => match[1] ?? '');
}

describe('firestore.rules code lists (spec 7.4)', () => {
  for (const [name, expected] of Object.entries(CODE_LISTS)) {
    it(`${name} equals the domain list`, () => {
      expect(listInRules(name)).toEqual([...expected]);
    });
  }
});

describe('firestore.rules structure', () => {
  const stripComments = (text: string): string => text.replace(/\/\/.*$/gm, '');
  const code = stripComments(firestoreRules);

  it('has balanced braces, brackets and parentheses', () => {
    for (const [open, close] of [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ] as const) {
      expect(code.split(open).length).toBe(code.split(close).length);
    }
  });

  it('calls only functions it defines, and defines each name once', () => {
    const defined = [...code.matchAll(/function (\w+)\(/g)].map((match) => match[1] ?? '');
    expect(new Set(defined).size).toBe(defined.length);
    const withoutDefinitions = code.replace(/function \w+\(/g, 'function (');
    // A call that is not a method (no dot before it) must be one of our own functions.
    const calls = [...withoutDefinitions.matchAll(/(?<![.\w])([a-zA-Z_]\w*)\(/g)].map(
      (match) => match[1] ?? '',
    );
    const unknown = calls.filter((name) => name !== 'function' && !defined.includes(name));
    expect(unknown).toEqual([]);
  });

  it('never allows a delete or a blanket write', () => {
    expect(code).not.toMatch(/allow[^;]*\bdelete\b/);
    expect(code).not.toMatch(/allow[^:;]*\bwrite\b/);
    const openAllows = [...code.matchAll(/allow ([^:]*): if true/g)].map((match) => match[1]);
    expect(openAllows.every((operation) => operation === 'read')).toBe(true);
  });

  it('only lets clients read, and only reads of public data without sign-in', () => {
    const publicPaths = [
      ...code.matchAll(/match (\/[^{\s]+\/\{\w+\}) \{\s*allow read: if true;/g),
    ].map((match) => match[1]);
    expect(publicPaths).toEqual(['/reference/{listId}', '/officialDates/{key}', '/config/{docId}']);
  });

  it('lists every synced collection of spec 7.6 under the owner', () => {
    for (const collection of [
      'donations',
      'receipts',
      'recurringRules',
      'recurringOccurrences',
      'reminders',
      'eidPlans',
      'eidPeople',
      'eidPacketGroups',
    ]) {
      expect(code).toContain(`match /${collection}/{id} {`);
    }
    for (const singleton of ['budget', 'profile', 'promptState']) {
      expect(code).toContain(`match /singletons/${singleton} {`);
    }
  });
});

describe('storage.rules (spec 12.4)', () => {
  const code = storageRules.replace(/\/\/.*$/gm, '');

  it('has one path, owner-only, with no update and a 10 MB cap', () => {
    expect(code.match(/match \//g)?.length).toBe(2);
    expect(code).toContain('match /users/{uid}/receipts/{receiptId} {');
    expect(code).toContain('allow update: if false;');
    expect(code).toContain('request.resource.size <= 10 * 1024 * 1024');
    expect(code).toContain(
      'allow read, delete: if request.auth != null && request.auth.uid == uid;',
    );
  });
});
