import type { LogRecord, LogSink } from '@muslim-give/observability';

/**
 * Development sink: prints the already-redacted record. This is the one place `console` is
 * allowed; release builds will add a Sentry breadcrumb sink beside it.
 */
export const consoleSink: LogSink = {
  write(record: LogRecord): void {
    const line = `${record.event} ${JSON.stringify(record.fields)}`;
    switch (record.level) {
      case 'debug':
        console.debug(line);
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
    }
  },
};
