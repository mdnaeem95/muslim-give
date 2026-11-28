import { scrubEvent, type LogRecord, type LogSink } from '@muslim-give/observability';

/**
 * The pure half of crash reporting (spec 20.1, threat T8). It decides whether reporting is on, what
 * the Sentry options are, and how a log record becomes a breadcrumb. The Sentry SDK itself is only
 * touched in `src/observability/sentry.ts`, so everything here is tested without a device.
 */

export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** A Sentry DSN: https, a public key, a host and a numeric project. Anything else turns reporting off. */
const DSN = /^https:\/\/[A-Za-z0-9]+@[A-Za-z0-9.-]+\/\d+$/;
const VERSION = /^[A-Za-z0-9._+-]{1,32}$/;

export interface CrashReportingInput {
  readonly dsn: unknown;
  readonly appEnvironment: unknown;
  readonly version: unknown;
}

export interface CrashReportingOptions {
  readonly dsn: string;
  readonly environment: AppEnvironment;
  readonly release: string;
  readonly sendDefaultPii: false;
  /** Zero until transactions have a scrubber of their own; the event scrubber drops them. */
  readonly tracesSampleRate: 0;
  readonly attachScreenshot: false;
  readonly attachViewHierarchy: false;
  readonly maxBreadcrumbs: number;
  readonly beforeSend: <T>(event: T) => T | null;
}

const isEnvironment = (value: unknown): value is AppEnvironment =>
  APP_ENVIRONMENTS.some((known) => known === value);

/**
 * The Sentry options for this build, or `null` when there is no valid DSN (reporting is off, which
 * is the case for local builds and CI). Every event passes through the allow-list scrubber.
 */
export function crashReportingOptions(input: CrashReportingInput): CrashReportingOptions | null {
  if (typeof input.dsn !== 'string' || !DSN.test(input.dsn)) return null;
  const version =
    typeof input.version === 'string' && VERSION.test(input.version) ? input.version : 'unknown';
  return {
    dsn: input.dsn,
    environment: isEnvironment(input.appEnvironment) ? input.appEnvironment : 'development',
    release: `muslim-give@${version}`,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    maxBreadcrumbs: 50,
    // The scrubber returns a smaller event of the same shape; the cast says so to the SDK's types.
    beforeSend: <T>(event: T): T | null => scrubEvent(event) as T | null,
  };
}

export interface Breadcrumb {
  readonly category: 'app' | 'error';
  readonly level: 'debug' | 'info' | 'warning' | 'error';
  readonly message: string;
  readonly data: Readonly<Record<string, string | number>>;
}

const BREADCRUMB_LEVEL = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
} as const;

/** A log record as a breadcrumb: its event code and its already-redacted fields, nothing else. */
export function toBreadcrumb(record: LogRecord): Breadcrumb {
  return {
    category: record.level === 'error' ? 'error' : 'app',
    level: BREADCRUMB_LEVEL[record.level],
    message: record.event,
    data: record.fields,
  };
}

/** Sends every record to each sink in order. */
export function combineSinks(...sinks: readonly LogSink[]): LogSink {
  return {
    write(record: LogRecord): void {
      for (const sink of sinks) sink.write(record);
    },
  };
}
