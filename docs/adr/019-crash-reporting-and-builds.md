# ADR 019: Crash reporting wiring and EAS builds

- Status: accepted
- Date: 2026-11-29

## Context

Spec 20.1 says crashes go to Sentry through an allow-list `beforeSend`, with no personal data, and spec 19 builds the app with EAS (one app per environment). ADR 011 built the scrubber and the logger as pure packages and left the wiring for later. Phase 0 needs a development build on a phone, which needs EAS and the Sentry SDK in place.

## Decisions

1. **The decisions are pure and tested; the SDK call is not.** `src/lib/crash-reporting.ts` returns the Sentry options (or `null`), turns a log record into a breadcrumb and combines log sinks. `src/observability/sentry.ts` only calls `Sentry.init` and `Sentry.addBreadcrumb`. Tests assert that the options keep personal data, screenshots and the view hierarchy off, that `beforeSend` is the allow-list scrubber, and that a breadcrumb survives that scrubber.
2. **No DSN, no reporting.** The DSN comes from `EXPO_PUBLIC_SENTRY_DSN`. A missing or malformed value turns reporting off, so local builds and CI send nothing. A DSN is not a secret (it only allows sending events), but it is set per environment in EAS, not in the repository.
3. **One Sentry project, three environments.** Events carry `environment` (development, staging, production) from `APP_ENV` and `release` `muslim-give@<version>`. Separate projects can come later if the volume needs it.
4. **Traces are off for now.** Spec 20.1 asks for 10% performance traces, but the scrubber builds a new event from an allow-list and a transaction has none of the allowed fields, so it would be emptied. `tracesSampleRate` is 0 until a transaction scrubber exists, with its own test. Crash-free sessions are still counted.
5. **Breadcrumbs are the logger's records.** Warnings and errors in release builds (everything in development builds) become breadcrumbs with the event code and the redacted fields. Touch, console and network breadcrumbs the SDK adds by itself are dropped by the scrubber, because their category is not on the allow-list.
6. **EAS has one new profile.** `development-simulator` extends `development` with `ios.simulator: true`, for a dev build that installs on the iOS simulator. The other three profiles are unchanged.

## Consequences

- The author must install two packages (`@sentry/react-native`, `expo-dev-client`), create the Expo and Sentry accounts and link the EAS project, all in `docs/eas-sentry-setup.md`.
- The Sentry Expo config plugin and source-map upload are not added yet. Spec 19.2 uploads source maps on a release tag, so they come with the release pipeline; until then production stack traces would be minified.
- The scrubber has been tested against hand-written events only. The first real event from a development build must be checked in Sentry's console (see the setup guide).
- Sentry's regions are the US and Germany; there is none in Singapore. Spec 20 and the privacy policy must name the region chosen (spec 14.4).
