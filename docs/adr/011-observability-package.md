# ADR 011: logging and crash-report scrubbing live in `packages/observability`

- Status: accepted
- Date: 2026-11-27

## Context

Spec 18.1 says the app logs only through a redacting logger, and spec 20.1 says Sentry events pass an allow-list `beforeSend`. Threat T8 (personal data leaking into logs, analytics or crash reports) needs an automated test of the redaction. Spec 6.1 puts the logger in `apps/mobile/src/observability`, which cannot be unit tested before the app exists.

## Decision

The logger, the error-code helper and the Sentry event scrubber are pure TypeScript in `packages/observability`, with no Sentry or React Native import. The app wires them in later: a sink that writes to the console in development and to Sentry breadcrumbs in release, and `beforeSend: scrubEvent`.

- Log fields pass an allow-list of names with per-field value rules: stable codes, fixed values or bounded integers. Free text cannot pass. Refused fields are counted, never recorded.
- Event names must be stable codes, so a message cannot be logged as an event.
- Errors are logged by code (`describeError`), never by message.
- `scrubEvent` builds a new event from an allow-list. A field added by an SDK update is dropped by default.

## Consequences

- The redaction is tested in CI with strings standing in for amounts, names, notes, emails, receipt names, record IDs, IP addresses and URLs.
- Adding a log field is a code change to `fields.ts` that a reviewer sees.
- Product analytics are not implemented. Decision D-18 (none, or a minimal list) is still open; the same field rules would apply.
- Spec 6.1 should show `packages/observability`.
