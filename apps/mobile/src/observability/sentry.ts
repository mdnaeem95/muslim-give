import type { LogSink } from '@muslim-give/observability';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { crashReportingOptions, toBreadcrumb } from '../lib/crash-reporting';

/**
 * The only file that touches the Sentry SDK (spec 20.1). The decisions live in
 * `lib/crash-reporting.ts`, which is tested; this file only hands the result to Sentry. Without a
 * valid `EXPO_PUBLIC_SENTRY_DSN` (local builds, CI) reporting stays off and nothing leaves the device.
 */
let started = false;

/** Starts crash reporting once. Returns whether it is on. */
export function startCrashReporting(): boolean {
  if (started) return true;
  const environment: unknown = Constants.expoConfig?.extra?.appEnvironment;
  const options = crashReportingOptions({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    appEnvironment: environment,
    version: Constants.expoConfig?.version,
  });
  if (options === null) return false;
  Sentry.init(options);
  started = true;
  return true;
}

/** Log records as Sentry breadcrumbs, when reporting is on. Records are already redacted. */
export const breadcrumbSink: LogSink = {
  write(record): void {
    if (started) Sentry.addBreadcrumb(toBreadcrumb(record));
  },
};
