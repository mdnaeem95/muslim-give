import { createLogger } from '@muslim-give/observability';
import { consoleSink } from './console-sink';

/** The app's only logger (spec 18.1). Release builds log warnings and errors only. */
export const logger = createLogger(consoleSink, __DEV__ ? 'debug' : 'warn');
