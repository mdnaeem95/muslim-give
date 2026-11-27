import { describeError } from './errors.js';
import { isCode, sanitiseFields, type FieldValue } from './fields.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  readonly level: LogLevel;
  /** A stable event code such as `sync.push_failed`; never a sentence. */
  readonly event: string;
  readonly fields: Readonly<Record<string, FieldValue>>;
  /** Number of refused fields; a developer signal that a call site needs fixing. */
  readonly dropped: number;
}

/** Where records go: the console in development, Sentry breadcrumbs in release. */
export interface LogSink {
  write(record: LogRecord): void;
}

export interface Logger {
  debug(event: string, fields?: Readonly<Record<string, unknown>>): void;
  info(event: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(event: string, fields?: Readonly<Record<string, unknown>>): void;
  error(event: string, fields?: Readonly<Record<string, unknown>>): void;
  /** Logs an error at `error` level using only its stable code, never its message. */
  failure(event: string, error: unknown, fields?: Readonly<Record<string, unknown>>): void;
}

const ORDER: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, warn: 2, error: 3 };

export const INVALID_EVENT = 'log.invalid_event';

/** The one way the app logs (spec 18.1). */
export function createLogger(sink: LogSink, minLevel: LogLevel): Logger {
  const write = (
    level: LogLevel,
    event: string,
    input: Readonly<Record<string, unknown>>,
  ): void => {
    if (ORDER[level] < ORDER[minLevel]) return;
    const { fields, dropped } = sanitiseFields(input);
    const valid = isCode(event);
    sink.write({
      level,
      event: valid ? event : INVALID_EVENT,
      fields,
      dropped: valid ? dropped : dropped + 1,
    });
  };
  return {
    debug: (event, fields = {}) => {
      write('debug', event, fields);
    },
    info: (event, fields = {}) => {
      write('info', event, fields);
    },
    warn: (event, fields = {}) => {
      write('warn', event, fields);
    },
    error: (event, fields = {}) => {
      write('error', event, fields);
    },
    failure: (event, error, fields = {}) => {
      write('error', event, { ...fields, code: describeError(error) });
    },
  };
}
