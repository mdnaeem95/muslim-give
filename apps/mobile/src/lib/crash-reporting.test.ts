import { createLogger, scrubEvent, type LogRecord, type LogSink } from '@muslim-give/observability';
import {
  combineSinks,
  crashReportingOptions,
  toBreadcrumb,
  type CrashReportingInput,
} from './crash-reporting';

const DSN = 'https://abc123def456@o1234.ingest.de.sentry.io/4567';
const valid: CrashReportingInput = { dsn: DSN, appEnvironment: 'staging', version: '0.1.0' };

describe('crashReportingOptions', () => {
  it('is off without a valid DSN', () => {
    for (const dsn of [
      undefined,
      null,
      42,
      '',
      '   ',
      'not a dsn',
      'http://abc123@host.io/1',
      'https://host.io/1',
      'https://abc123@host.io/project',
      `${DSN}\nhttps://evil.example`,
    ]) {
      expect(crashReportingOptions({ ...valid, dsn })).toBeNull();
    }
  });

  it('keeps personal data, screenshots and traces off (spec 20.1)', () => {
    const options = crashReportingOptions(valid);
    expect(options).toMatchObject({
      dsn: DSN,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 50,
    });
  });

  it('names the environment and the release', () => {
    expect(crashReportingOptions(valid)).toMatchObject({
      environment: 'staging',
      release: 'muslim-give@0.1.0',
    });
  });

  it('falls back to development and an unknown version for bad values', () => {
    for (const appEnvironment of [undefined, 'qa', 7]) {
      expect(crashReportingOptions({ ...valid, appEnvironment })?.environment).toBe('development');
    }
    for (const version of [undefined, 3, '', 'a b', 'x'.repeat(33)]) {
      expect(crashReportingOptions({ ...valid, version })?.release).toBe('muslim-give@unknown');
    }
    expect(crashReportingOptions({ ...valid, appEnvironment: 'production' })?.environment).toBe(
      'production',
    );
  });

  it('scrubs every event with the allow-list scrubber', () => {
    const options = crashReportingOptions(valid);
    const event = {
      event_id: 'a'.repeat(32),
      message: 'Donation of S$50 to Masjid Al-Falah failed',
      user: { email: 'someone@example.com' },
      level: 'error',
    };
    const scrubbed = options?.beforeSend(event);
    expect(scrubbed).toEqual(scrubEvent(event));
    expect(JSON.stringify(scrubbed)).not.toMatch(/Masjid|someone|S\$50/);
    expect(options?.beforeSend('not an event')).toBeNull();
  });
});

describe('toBreadcrumb', () => {
  const record = (level: LogRecord['level']): LogRecord => ({
    level,
    event: 'sync.push_failed',
    fields: { code: 'net.offline', attempts: 2 },
    dropped: 0,
  });

  it('maps each level and files errors under the error category', () => {
    expect(toBreadcrumb(record('debug'))).toMatchObject({ category: 'app', level: 'debug' });
    expect(toBreadcrumb(record('info'))).toMatchObject({ category: 'app', level: 'info' });
    expect(toBreadcrumb(record('warn'))).toMatchObject({ category: 'app', level: 'warning' });
    expect(toBreadcrumb(record('error'))).toMatchObject({ category: 'error', level: 'error' });
  });

  it('carries the event code and the redacted fields only', () => {
    expect(toBreadcrumb(record('warn'))).toEqual({
      category: 'app',
      level: 'warning',
      message: 'sync.push_failed',
      data: { code: 'net.offline', attempts: 2 },
    });
  });

  it('survives the event scrubber, so the breadcrumb reaches Sentry', () => {
    const breadcrumbs = (['warn', 'error'] as const).map((level) => toBreadcrumb(record(level)));
    const scrubbed = scrubEvent({ breadcrumbs });
    expect(scrubbed?.breadcrumbs).toEqual([
      {
        category: 'app',
        level: 'warning',
        message: 'sync.push_failed',
        data: breadcrumbs[0]?.data,
      },
      {
        category: 'error',
        level: 'error',
        message: 'sync.push_failed',
        data: breadcrumbs[1]?.data,
      },
    ]);
  });

  it('never carries text typed by a person, even through the logger', () => {
    const seen: LogRecord[] = [];
    const logger = createLogger({ write: (r) => seen.push(r) }, 'debug');
    logger.warn('donation.saved', { note: 'For my mother', code: 'ok' });
    const [only] = seen;
    expect(only).toBeDefined();
    expect(JSON.stringify(toBreadcrumb(only as LogRecord))).not.toContain('mother');
  });
});

describe('combineSinks', () => {
  it('writes each record to every sink in order', () => {
    const calls: string[] = [];
    const sink = (name: string): LogSink => ({ write: (r) => calls.push(`${name}:${r.event}`) });
    combineSinks(sink('a'), sink('b')).write({
      level: 'info',
      event: 'app.started',
      fields: {},
      dropped: 0,
    });
    expect(calls).toEqual(['a:app.started', 'b:app.started']);
  });

  it('does nothing without sinks', () => {
    expect(() => {
      combineSinks().write({ level: 'info', event: 'app.started', fields: {}, dropped: 0 });
    }).not.toThrow();
  });
});
