# Phase 0: Foundations, evidence log

Gate (spec 21): CI green on both platforms; domain at 100% branch coverage; Hijri oracle test passing; a development build runs on one iPhone and one Android phone.

## Gate checklist

- [ ] CI green on both platforms (Android and iOS jobs not yet built)
- [x] Domain at 100% branch coverage (enforced by the Jest threshold; see PR #1 and PR #2)
- [x] Hijri oracle test passing (PR #2)
- [ ] Development build on one iPhone and one Android phone (Expo app not yet created)
- [ ] Remaining Phase 0 scope: budget, totals, recurring, reminders, Eid and prompt rules; SQLite schema v1 with migrations; outbox; logger; Sentry; design tokens; Firebase projects; EAS set-up

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
