# Phase 0: Foundations, evidence log

Gate (spec 21): CI green on both platforms; domain at 100% branch coverage; Hijri oracle test passing; a development build runs on one iPhone and one Android phone.

## Gate checklist

- [ ] CI green on both platforms (Android and iOS jobs not yet built)
- [x] Domain at 100% branch coverage (enforced by the Jest threshold; see PR #1 and PR #2)
- [x] Hijri oracle test passing (PR #2)
- [ ] Development build on one iPhone and one Android phone (Expo app not yet created)
- [x] Domain rules: money, dates, Hijri, totals, budget, recurring, reminders, Friday, Eid, account prompt (PRs #1, #2, #4)
- [x] Design tokens with contrast checks (PR #5)
- [ ] Remaining Phase 0 scope: SQLite schema v1 with migrations; outbox; logger; Sentry; core components; Firebase projects; EAS set-up

Phase sign-off: not yet.

## PR #1: monorepo scaffold, CI, money and civil dates

- Requirement or rule IDs: R-MON-1 to R-MON-5, R-DATE-1, R-DATE-2; spec 18.2 and 19.2 (tooling and pipeline)
- CI run: PR #1 checks, all green after the formatting and lint fixes
- Tests: 19 passed of 19 (2 suites), from the author's terminal run with the pinned dependencies
- Coverage: 100% statements, branches, functions and lines (terminal run, `pnpm test`)
- What the tests prove: money parses without floating point and rejects extra decimals; currencies never mix; the sanity bound applies per currency exponent; civil dates reject impossible dates; leap-year and month-end arithmetic; the 29 February anchor falls on 28 February in non-leap years
- Manual or device checks: none (no UI yet)
- Not verified, and why: the ISO 4217 exponent table is a default-2 rule plus known exceptions, not the CLDR-generated table the spec calls for (follow-up)
- Spec or docs updated: `docs/dependencies.md` records the TypeScript 5.9, Node 22 and pnpm 10 decisions

Issues found and fixed while closing the PR: TypeScript 7 broke ts-jest and typescript-eslint, so 5.9 is pinned in both the root and the domain package; Jest needs the VM modules flag for ESM; a formatter version mismatch reverted one file, which CI caught.

## PR #2: Umm al-Qura Hijri table with ICU oracle test

- Requirement or rule IDs: R-HIJ-01, R-HIJ-02, R-HIJ-04, R-HIJ-05, R-HIJ-06
- CI run: PR #2 checks, green after three lint fixes
- Tests: 35 passed of 35 in the domain package (19 existing, 15 unit tests, 1 oracle test), counted from the local run; CI enforces the 100% threshold and the job was green
- Coverage: 100% on the new module in the local run; the CI threshold would have failed the build otherwise
- What the tests prove: the table spans 1356 to 1500 AH; every one of about 52,000 days matches Node's full-ICU `islamic-umalqura` (ICU 78.3) and round-trips; dates outside the table return no Hijri date; the plus or minus one day adjustment looks up the shifted civil date; the nine special days and the 14-day look-ahead behave per spec
- Manual or device checks: none. The oracle compares against desktop Node ICU, not against Hermes on a phone, which is the point of the in-house table, but it is not yet run on a device.
- Not verified, and why: official month starts per country and the "expected" tag are not built (they need the reference-data model); behaviour on a real iPhone and Android phone is not yet tested
- Spec or docs updated: none needed

Issues found and fixed while closing the PR: three strict lint rules (`prefer-optional-chain`, `non-nullable-type-assertion-style`, `restrict-template-expressions`) were fixed after CI reported them. The local environment could not run ESLint, which is why they reached CI.

## PR #3: delivery evidence process

- Requirement or rule IDs: spec 18.3 and 18.5 (PR checklist, Definition of Done)
- CI run: PR #3 checks. The first run with the new "Test evidence" step is the proof that the summary and artifact work.
- Tests: no new tests; the existing 35 run under the new JSON reporter
- Coverage: unchanged
- What this proves: each CI run now records test and coverage numbers in the job summary and keeps the report for 90 days
- Manual or device checks: none
- Not verified, and why: the summary step has only been run on sample data locally; confirm it on the first CI run of this PR
- Spec or docs updated: the spec's Definition of Done (section 18.5) should gain "evidence entry added" in the Claude Doc and the repo snapshot; not done in this PR

## PR #4: totals, budget, monthly giving, reminders, Friday, Eid and account-prompt rules

- Requirement or rule IDs: R-TOT-01 to 04; R-BUD-02 to 06; R-REC-02, 03, 05, 07, 10; R-YR-02 to 05; R-FRI-02, 03; R-EID-01, 02, 03, 05, 07, 09; spec 9.2 (account prompt)
- CI run: PR #4 checks (the "Test evidence" job summary holds the authoritative numbers; copy them here at merge)
- Tests: 108 passed across the domain package, counted from the local run before CI
- Coverage: 100% statements, branches, functions and lines on every source file in the local run; the Jest threshold enforces it in CI
- What the tests prove: money totals never mix currencies; overseas is derived from the current home country; Eid Planner entries stay out of monthly budget spend; budget levels use exact integer maths at the 80%, 100% and over boundaries; monthly giving generates each due month once (running twice or after a sync adds nothing), clamps day 31 to short months, and treats 29 February correctly; reminders repeat on the Gregorian month-day with the 29 February rule and list the next 7 days soonest first; the Friday card and repeat gift follow the exclusions; the Eid plan adds up, reads "given" back from the log, and packet counters stop at the count; the account prompt asks at 5 entries, then at 15 entries or 14 days, then never, and defers behind a modal
- Manual or device checks: none (no UI yet)
- Not verified, and why: ESLint and the pinned Prettier were not run locally (no network installs here), so CI is the first lint run; six interpretations of ambiguous spec wording are listed in the PR description and await sign-off; Eid person and packet transactions and export belong with the data layer
- Spec or docs updated: none needed

## PR #5: design tokens with WCAG AA contrast checks

- Requirement or rule IDs: spec 6.5 (design system tokens, colour never the only signal, contrast test), 6.6 (touch targets, dynamic type limit), R-BUD-03 (meter colours)
- CI run: PR #5 checks (the "Test evidence" summary now lists both packages; copy the numbers here at merge)
- Tests: 46 passed in `packages/ui-tokens`, counted from the local run before CI
- Coverage: 100% on every source file in the local run
- What the tests prove: the light palette uses the prototype's exact hex values; light and dark define the same tokens; all 17 text pairings meet WCAG AA (4.5:1) in both modes (34 checks); the contrast maths matches the published 4.54:1 reference; the type scale, weights, spacing grid, square corners and touch targets match the spec
- Manual or device checks: none (no UI yet). Contrast is computed, not eyeballed, but real-device readability in sunlight is not yet checked.
- Not verified, and why: ESLint and the pinned Prettier were not run on this package locally; dark mode values are new (the prototype has none) and need a design review before dark mode is enabled; the package's test dependencies and lockfile need the author's `pnpm add` step
- Finding: the prototype's green text on its light-green tint is 3.95:1, below AA, so the `primaryText` token uses the dark green for text
- Spec or docs updated: none needed

## PR #6: shared vocabulary, relationship rules and input schemas

- Requirement or rule IDs: R-REL (relationship selectors, spouse hidden for single users, in-law labels), R-MON (integer minor units), R-REC-02, R-YR, R-EID-04 and R-EID-07 input validation, spec 7.5 (profile and prompt state), spec 10.1 (Log Donation validation)
- CI run: PR #6 checks (the "Test evidence" summary now lists three packages; copy the numbers here at merge)
- Tests: 35 passed in `packages/schema` plus new relationship tests in `packages/domain`, counted from the local run before CI
- Coverage: 100% statements, branches, functions and lines in `packages/schema` in the local run; the Jest threshold enforces it in CI
- What the tests prove: every cross-field donation rule is rejected with a stable error code (mosque and charity names, relationship only for individuals, side and line only where they apply, spouse options hidden for single or unset users, Others-only free text, on-behalf name rules); dates cannot be in the future; amounts are positive integers; unknown fields are rejected; monthly giving allows days 1 to 31 and no future start month; Eid people exclude Stranger; packet counts stay between 0 and 999
- Manual or device checks: none (no UI yet)
- Not verified, and why: the schemas were run here against zod 3.25's `zod/v4` build, not the pinned zod 4 release, and ESLint and the pinned Prettier were not run locally, so CI is the first real run; the package's dependencies and lockfile need the author's `pnpm add` step
- Spec or docs updated: none needed

## PR #7: local database schema v1 (`packages/local-db`)

- Requirement or rule IDs: spec 7.1 (money), 7.2 (dates), 7.3 (deterministic IDs, singletons), 7.4 (stable codes), 7.5 (SQLite schema and indexes), 8.2 (outbox columns), R-REC-02, R-EID-04, R-EID-07, R-REL
- CI run: PR #7 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 24, counted from the local run before CI
- Coverage: the Jest threshold enforces 100% in CI; not measured locally for this package
- What the tests prove: the migrations create exactly the tables the Drizzle schema defines; the database refuses what the domain refuses (non-positive amounts, lower-case or wrong-length currency and country codes, malformed dates, missing mosque or charity names, relationship fields on non-individuals, free text on the wrong occasion or on-behalf value, day of month outside 1 to 31, Friday prayer in monthly giving, Stranger in the Eid Planner, packet counts outside 0 to 999); one monthly-giving gift per rule per month; one Eid plan per year; singleton tables hold only their fixed ID; foreign keys are enforced; every code in the domain vocabulary is accepted, and a display label is refused
- Manual or device checks: none. Tests run on Node's SQLite, not on `expo-sqlite` on a phone.
- Not verified, and why: the migration SQL had to be generated by the author (`drizzle-kit` could not be installed here); the tests were first run against SQL emitted by a local stand-in for Drizzle, so CI on the real generated SQL is the first genuine run. Migration from an older schema version, the migration runner with its backup and restore, and `expo-sqlite` behaviour are not built yet.
- Spec or docs updated: ADR 010 added; spec 6.1 should show `packages/local-db` (not done in this PR)

## PR #9: hybrid logical clock and identifiers

- Requirement or rule IDs: spec 7.2 (HLC format), 7.3 (UUIDv7, deterministic IDs, singletons), 8.3 and 8.4 (HLC comparison and the apply rule), 8.8 (clock skew, convergence)
- CI run: PR #9 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 25 new, counted from the local run before CI
- Coverage: 100% statements, branches, functions and lines on the new files in the local run; the Jest threshold enforces it in CI
- What the tests prove: HLC text is fixed width, so text order is time order, with a stable tie-break by device; a stamp made after a local change or after receiving a remote one is always greater than both, including when the wall clock goes backwards, when one device is 3 days fast, and when the counter runs out; two simulated devices that receive the same changes in opposite orders end with identical records (200 seeded runs each); UUIDv7 values have the right version and variant bits and sort by time; monthly giving gets the same donation ID on every device; singleton IDs match the database constraints
- Manual or device checks: none
- Not verified, and why: ESLint was not run locally (no `typescript-eslint` in the sandbox); the simulations are seeded loops, not the 10,000-run `fast-check` property test in spec 8.8, which belongs with the sync engine; secure random bytes and the clock come from the app and are not built yet
- Spec or docs updated: none needed

## PR #10: the outbox

- Requirement or rule IDs: spec 8.2 (outbox, coalescing, same-transaction writes), 8.3 (batch size 400, backoff 2 s to 15 min with jitter, permanent errors never block other rows), 8.7 (sign-out needs an empty outbox)
- CI run: PR #10 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 23 new in `packages/local-db` (outbox), 6 new in `packages/domain` (backoff, instant arithmetic), counted from the local run before CI
- Coverage: 100% on the new files in the local run; the Jest threshold enforces it in CI
- What the tests prove: ten edits to one record leave one queued row; a record change and its outbox row commit or roll back together, including when nested inside a larger transaction; a row replaced by a newer edit while its older version is uploading is not removed by the old acknowledgement; retries wait 2, 4, 8 s and so on, never more than 15 minutes, with jitter between half and all of each delay; a backed-off row is hidden until due; a parked row stays in the outbox, is never offered again, and does not stop other rows; a corrupt database row raises an error instead of being guessed at
- Manual or device checks: none. Tests run on Node's SQLite, not `expo-sqlite`.
- Not verified, and why: the app's `expo-sqlite` adapter for `SqlExecutor` is not built, and its transaction and savepoint behaviour must be checked on a device; ESLint was not run locally
- Note: permanent failures are parked with a far-future retry time (`PARKED_UNTIL`) instead of a new column, so no migration is needed. If a separate flag is preferred, it is a one-column migration.
- Spec or docs updated: none needed

## PR #11: reconcile and the pull apply rule

- Requirement or rule IDs: spec 8.6 (the five reconcile invariants), 8.4 (apply rule, 60-second overlap), 8.8 (sync tests)
- CI run: PR #11 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 19 new in `packages/domain`, counted from the local run before CI
- Coverage: 100% on the new files in the local run; the Jest threshold enforces it in CI
- What the tests prove: each of the five invariants produces exactly its fix and nothing for consistent data (Eid person with a deleted donation shows as not given; a gift whose Eid person was deleted keeps the gift and loses the link; a logged occurrence with no live donation becomes declined; a live monthly-giving donation without an occurrence gets one, including reviving a deleted one under the same ID; a receipt of a deleted donation is deleted); fixes come out in a stable order; across 300 seeded random inconsistent snapshots, applying the fixes leaves nothing more to fix; a pulled page applies only newer or unknown records, breaks same-time ties by device, skips documents with an invalid timestamp without stopping, and is harmless to plan twice; the pull window re-reads 60 seconds before the cursor
- Manual or device checks: none
- Not verified, and why: ESLint was not run locally; the data layer that applies the fixes and the pulled documents (and writes them through the outbox rules) is not built yet, so the property test uses a stand-in `applyFixes` that lives in the test file
- Spec or docs updated: none needed

## PR #12: redacting logger and Sentry scrubber (`packages/observability`)

- Requirement or rule IDs: spec 18.1 (logging only through the redacting logger), 20.1 (Sentry allow-list, "a unit test asserts no event carries a field outside the allow-list"), threat T8 (personal data in logs and crash reports)
- CI run: PR #12 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 25 in `packages/observability`, counted from the local run before CI
- Coverage: 100% statements, branches, functions and lines in the local run; the Jest threshold enforces it in CI
- What the tests prove: log fields not on the allow-list (amounts, names, notes, emails, income, receipt names, record IDs, even `constructor`) are dropped and counted, and their names and values appear nowhere in the output; allowed fields with wrong values (free text, unknown provider, out-of-range numbers) are dropped too; an event name that is not a stable code is replaced; an error is logged by its code only, never its message; the Sentry scrubber removes message, user, request, extra, local variables, source lines, free-text exception values, free-text breadcrumb messages and unrecognised context fields, and every key left in a deliberately hostile event is on the allow-list; ten strings standing in for personal data (amount, name, mosque, email, note, receipt name, record ID, IP address, URL) do not appear anywhere in the scrubbed event
- Manual or device checks: none. Sentry itself is not wired in; the scrubber is tested on plain objects shaped like Sentry events, not on events from the real SDK.
- Not verified, and why: ESLint was not run locally; the real Sentry event shape may carry fields this allow-list drops, which is the safe direction, but the first device build should be checked to confirm crash reports still contain a usable stack trace and release; product analytics are not built because decision D-18 is open
- Spec or docs updated: ADR 011 added; spec 6.1 should show `packages/observability` (not done in this PR)

## PR #13: Expo app shell (`apps/mobile`)

- Requirement or rule IDs: spec 6.2 (clock provider, no component reads the system clock), 6.3 (error boundary per tab), 6.4 (five tabs in order, Dashboard default route, unknown links open the Dashboard), 6.6 (dynamic type limit, accessibility labels), 6.7 (no string literals in components, `en-SG` date format), 18.1 (logging only through the logger), 19.1 (three app IDs by `APP_ENV`), ADR 012
- CI run: PR #13 checks (copy the numbers from the "Test evidence" summary at merge)
- Tests: 11 in `apps/mobile/src/lib`, counted from the local run before CI
- Coverage: the Jest threshold enforces 100% on `src/lib` in CI; screens, providers and the error boundary are not covered by unit tests yet
- What the tests prove: the clock turns the device day into a civil date and follows midnight; dates format as "5 Mar 2027" without `Intl`; Hijri dates show the Malay month names; the translator fills placeholders, keeps unfilled ones visible and shows the key for a missing one
- Manual or device checks: none done by the author of this PR. To run: `pnpm --filter @muslim-give/mobile bundle:check`, then a development build on one iPhone and one Android phone, and confirm the five tabs, the Dashboard showing today's Gregorian and Hijri date, and the accessibility labels with VoiceOver and TalkBack.
- Not verified, and why: nothing here was run through Metro, a simulator or a phone (no network installs in the sandbox), so the Metro `.js` resolution, Expo Router wiring and the tab layout are untested; ESLint was not run locally; app icon, splash and Noto Sans are not bundled; component tests are not set up
- Spec or docs updated: ADR 012 added; spec 6.4 (native tabs) and 6.1 (`packages/observability`, `packages/local-db`) should be updated in the Doc
