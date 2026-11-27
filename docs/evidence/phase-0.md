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
