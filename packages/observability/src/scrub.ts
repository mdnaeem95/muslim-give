import { isCode, sanitiseFields } from './fields.js';

/**
 * The Sentry `beforeSend` scrubber (spec 20.1). It builds a new event from an allow-list instead of
 * deleting known-bad fields, so a field added by an SDK update is dropped by default. Messages,
 * users, requests, extra data, local variables and source lines never pass.
 */

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const items = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const matching = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === 'string' && pattern.test(value) ? value : undefined;

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Copies an object without its undefined entries, so absent means absent. */
function compact(entries: Readonly<Record<string, unknown>>): Plain {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));
}

/** `undefined` instead of an empty object, so empty parts are left out. */
const nonEmpty = <T extends object>(value: T): T | undefined =>
  Object.keys(value).length > 0 ? value : undefined;

/** `undefined` instead of an empty list. */
const filled = <T>(list: readonly T[]): readonly T[] | undefined =>
  list.length > 0 ? list : undefined;

const EVENT_ID = /^[0-9a-f]{32}$/;
const LEVEL = /^(fatal|error|warning|log|info|debug)$/;
const VERSION = /^[A-Za-z0-9._@+-]{1,64}$/;
const LABEL = /^[A-Za-z0-9 _.,()+/-]{1,64}$/;
const FILE = /^[A-Za-z0-9_@$.:/-]{1,200}$/;
const FUNCTION_NAME = /^[A-Za-z0-9_$.<>@ ]{1,100}$/;
const BREADCRUMB_CATEGORY = /^(navigation|sync|error|app)$/;
const EXCEPTION_TYPE = /^[A-Za-z][A-Za-z0-9_.]{0,63}$/;

function frame(raw: unknown): Plain | undefined {
  if (!isPlain(raw)) return undefined;
  return nonEmpty(
    compact({
      filename: matching(raw.filename, FILE),
      function: matching(raw.function, FUNCTION_NAME),
      lineno: finite(raw.lineno),
      colno: finite(raw.colno),
      in_app: typeof raw.in_app === 'boolean' ? raw.in_app : undefined,
    }),
  );
}

function exceptionValue(raw: unknown): Plain | undefined {
  if (!isPlain(raw)) return undefined;
  const stacktrace = isPlain(raw.stacktrace) ? raw.stacktrace : {};
  const frames = items(stacktrace.frames)
    .map(frame)
    .filter((entry): entry is Plain => entry !== undefined);
  return nonEmpty(
    compact({
      type: matching(raw.type, EXCEPTION_TYPE),
      // The message is kept only if it is a stable code; free text can hold record content.
      value: isCode(raw.value) ? raw.value : undefined,
      stacktrace: nonEmpty(compact({ frames: filled(frames) })),
    }),
  );
}

function breadcrumb(raw: unknown): Plain | undefined {
  if (!isPlain(raw)) return undefined;
  const category = matching(raw.category, BREADCRUMB_CATEGORY);
  if (category === undefined) return undefined;
  const data = isPlain(raw.data) ? sanitiseFields(raw.data).fields : {};
  return compact({
    category,
    level: matching(raw.level, LEVEL),
    timestamp: finite(raw.timestamp),
    message: isCode(raw.message) ? raw.message : undefined,
    data: nonEmpty(data),
  });
}

function context(raw: unknown, keys: readonly string[]): Plain | undefined {
  if (!isPlain(raw)) return undefined;
  return nonEmpty(
    compact(Object.fromEntries(keys.map((key) => [key, matching(raw[key], LABEL)] as const))),
  );
}

/** Returns the scrubbed copy of a Sentry event, or `null` to drop an event that is not an object. */
export function scrubEvent(event: unknown): Plain | null {
  if (!isPlain(event)) return null;
  const contexts = isPlain(event.contexts) ? event.contexts : {};
  const exception = isPlain(event.exception) ? event.exception : {};
  const values = items(exception.values)
    .map(exceptionValue)
    .filter((entry): entry is Plain => entry !== undefined);
  const crumbs = items(event.breadcrumbs)
    .map(breadcrumb)
    .filter((entry): entry is Plain => entry !== undefined);
  const tags = isPlain(event.tags) ? sanitiseFields(event.tags).fields : {};
  return compact({
    event_id: matching(event.event_id, EVENT_ID),
    timestamp: finite(event.timestamp),
    platform: matching(event.platform, LABEL),
    level: matching(event.level, LEVEL),
    release: matching(event.release, VERSION),
    dist: matching(event.dist, VERSION),
    environment: matching(event.environment, LABEL),
    exception: nonEmpty(compact({ values: filled(values) })),
    breadcrumbs: filled(crumbs),
    tags: nonEmpty(tags),
    contexts: nonEmpty(
      compact({
        os: context(contexts.os, ['name', 'version']),
        device: context(contexts.device, ['model', 'family']),
        app: context(contexts.app, ['app_version', 'app_build']),
      }),
    ),
  });
}
