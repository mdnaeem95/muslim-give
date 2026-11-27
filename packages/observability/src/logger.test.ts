import { createLogger, INVALID_EVENT, type LogRecord } from './logger.js';

function capture(minLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug') {
  const records: LogRecord[] = [];
  const logger = createLogger(
    {
      write: (record) => {
        records.push(record);
      },
    },
    minLevel,
  );
  return { records, logger };
}

describe('logger (spec 18.1)', () => {
  it('writes each level with its event and fields', () => {
    const { records, logger } = capture();
    logger.debug('app.start');
    logger.info('sync.started', { collection: 'donations' });
    logger.warn('sync.slow', { durationMs: 9000 });
    logger.error('sync.failed', { code: 'unavailable', attempts: 2 });
    expect(records.map((record) => record.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(records[1]).toEqual({
      level: 'info',
      event: 'sync.started',
      fields: { collection: 'donations' },
      dropped: 0,
    });
    expect(records[0]?.fields).toEqual({});
  });
  it('accepts calls with and without fields on every level', () => {
    const { records, logger } = capture();
    logger.debug('app.ping');
    logger.debug('app.ping', { count: 1 });
    logger.info('app.ping');
    logger.info('app.ping', { count: 1 });
    logger.warn('app.ping');
    logger.warn('app.ping', { count: 1 });
    logger.error('app.ping');
    logger.error('app.ping', { count: 1 });
    expect(records).toHaveLength(8);
  });
  it('skips levels below the minimum', () => {
    const { records, logger } = capture('warn');
    logger.debug('a.b');
    logger.info('a.b');
    logger.warn('a.b');
    logger.error('a.b');
    expect(records.map((record) => record.level)).toEqual(['warn', 'error']);
  });
  it('drops personal data from fields and counts what it dropped', () => {
    const { records, logger } = capture();
    logger.info('donation.saved', {
      amountMinor: 1250,
      recipientName: 'Aisyah',
      note: 'for Mak',
      email: 'isa@example.com',
      count: 1,
    });
    expect(records[0]?.fields).toEqual({ count: 1 });
    expect(records[0]?.dropped).toBe(4);
    expect(JSON.stringify(records)).not.toMatch(/Aisyah|1250|Mak|isa@/);
  });
  it('replaces an event name that is not a stable code, so a message cannot slip in', () => {
    const { records, logger } = capture();
    logger.info('Saved S$12.50 for Aisyah', { count: 1 });
    expect(records[0]?.event).toBe(INVALID_EVENT);
    expect(records[0]?.dropped).toBe(1);
    expect(JSON.stringify(records)).not.toContain('Aisyah');
  });
  it('failure logs only the error code, never the message', () => {
    const { records, logger } = capture();
    logger.failure('sync.push_failed', new Error('Failed to write gift for Aisyah'), {
      attempts: 3,
    });
    logger.failure('sync.push_failed', { code: 'permission-denied' });
    expect(records[0]).toEqual({
      level: 'error',
      event: 'sync.push_failed',
      fields: { attempts: 3, code: 'error.error' },
      dropped: 0,
    });
    expect(records[1]?.fields).toEqual({ code: 'permission-denied' });
    expect(JSON.stringify(records)).not.toContain('Aisyah');
  });
});
