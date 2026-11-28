import { createLogger } from '@muslim-give/observability';
import { combineSinks } from '../lib/crash-reporting';
import { consoleSink } from './console-sink';
import { breadcrumbSink } from './sentry';

/** The app's only logger (spec 18.1). Release builds log warnings and errors only. */
export const logger = createLogger(
  combineSinks(consoleSink, breadcrumbSink),
  __DEV__ ? 'debug' : 'warn',
);
