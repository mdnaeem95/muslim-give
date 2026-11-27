/**
 * The only fields that may appear in a log line, a breadcrumb or a crash-report tag (spec 18.1,
 * 20.1, threat T8). Anything else is dropped and counted, never written. Rules accept stable codes,
 * a few fixed values and bounded numbers; free text cannot pass.
 */

/** A stable code or screen name: lower-case, no spaces, no '@', nothing shaped like data. */
const IDENT = /^[a-z][a-z0-9_.:/-]{0,63}$/;
const LONG_DIGITS = /\d{4,}/;
const LONG_HEX = /[0-9a-f]{12,}/;

/** True for text that is safe to log as a code (developer-chosen, not user data). */
export const isCode = (value: unknown): value is string =>
  typeof value === 'string' &&
  IDENT.test(value) &&
  !LONG_DIGITS.test(value) &&
  !LONG_HEX.test(value);

type Rule =
  | { readonly kind: 'code' }
  | { readonly kind: 'oneOf'; readonly values: readonly string[] }
  | { readonly kind: 'count'; readonly max: number };

const code: Rule = { kind: 'code' };
const oneOf = (...values: string[]): Rule => ({ kind: 'oneOf', values });
const count = (max: number): Rule => ({ kind: 'count', max });

/** Collection names used by sync; the same names as the Firestore sub-collections (spec 7.6). */
export const COLLECTIONS = [
  'donations',
  'receipts',
  'recurringRules',
  'recurringOccurrences',
  'reminders',
  'eidPlans',
  'eidPeople',
  'eidPacketGroups',
  'profile',
  'budget',
  'promptState',
] as const;

const RULES = new Map<string, Rule>([
  ['code', code],
  ['screen', code],
  ['collection', oneOf(...COLLECTIONS)],
  ['provider', oneOf('apple', 'google')],
  ['os', oneOf('ios', 'android')],
  ['outboxBucket', oneOf('0', '1-10', '10+')],
  ['durationMs', count(86_400_000)],
  ['count', count(1_000_000_000)],
  ['attempts', count(1_000)],
]);

/** The field names a caller may use. */
export const ALLOWED_FIELDS: readonly string[] = [...RULES.keys()];

export type FieldValue = string | number;

function accepts(rule: Rule, value: unknown): value is FieldValue {
  switch (rule.kind) {
    case 'code':
      return isCode(value);
    case 'oneOf':
      return typeof value === 'string' && rule.values.includes(value);
    case 'count':
      return (
        typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= rule.max
      );
  }
}

export interface SanitisedFields {
  readonly fields: Readonly<Record<string, FieldValue>>;
  /** How many fields were refused. Names and values are not recorded. */
  readonly dropped: number;
}

/** Keeps only allow-listed fields whose values pass their rule. */
export function sanitiseFields(input: Readonly<Record<string, unknown>>): SanitisedFields {
  const fields: Record<string, FieldValue> = {};
  let dropped = 0;
  for (const [name, value] of Object.entries(input)) {
    const rule = RULES.get(name);
    if (rule !== undefined && accepts(rule, value)) fields[name] = value;
    else dropped++;
  }
  return { fields, dropped };
}
