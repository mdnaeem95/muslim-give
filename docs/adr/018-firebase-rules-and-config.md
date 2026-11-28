# ADR 018: Firebase configuration, security rules and rules tests

- Status: accepted
- Date: 2026-11-28

## Context

Spec 12 puts most of the backend's protection in security rules: owner-only access, a shape and size check on every write, and the server settling last-writer-wins. Phase 0 asks for three Firebase projects in Singapore. The rules must exist and be tested before sync is written, so the sync engine is built against them and not the other way round.

## Decisions

1. **Everything lives in `firebase/`**: `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json` (rules paths, emulator ports, Firestore location `asia-southeast1`), `.firebaserc` (aliases `dev`, `staging`, `prod` for the project IDs in spec 19.1) and the tests. It is a workspace package, `@muslim-give/firebase`, so typecheck and lint run on the tests like any other code.
2. **Rules are stricter than the spec's outline in three places.**
   - **No tombstone shortcut.** The outline accepts a deleted record without checking its fields. A tombstone is a snapshot of a record that was valid, so the rules check it like any other write; otherwise a phone could store arbitrary data in a "deleted" record.
   - **Every record lists its allowed fields** (`hasOnly`: the sync columns plus the record's own), so a modified client cannot add fields.
   - **Singletons** (`budget`, `profile`, `promptState`) each have their own path and checks. The `promptState` document carries the id `prompt_state`, the same as its SQLite row.
3. **Code lists in the rules are checked against the domain.** Category, relationship, occasion, giving type and the other lists are written into `firestore.rules` as small functions. A test (`drift.test.ts`) fails if any of them differs from `packages/domain/src/codes.ts`, so a new occasion cannot be added to the app and rejected by the server.
4. **Two kinds of test.**
   - `pnpm test` runs checks that need no emulator: the code lists match, the rules are balanced, every function they call is defined, no client delete or blanket write exists, and only the three public paths are readable without sign-in.
   - `pnpm test:rules` starts the Firestore and Storage emulators and runs every allow and deny path: owner, other user and signed-out visitor; valid, invalid and boundary values for each collection; missing and extra fields; a made-up server time; older, equal and newer clocks; tombstones; lists; unknown paths. It is a separate CI job, `rules`, because it needs Java and a download.
5. **The project is `demo-muslim-give` in tests**, so a test can never touch a real project.
6. **Deployment is not set up yet.** Phase 0 creates the projects and proves the rules locally. Deploying from CI (spec 19.2) needs a service account per project and comes with the staging pipeline.

## Consequences

- The author must run `pnpm install` once after pulling this change (new dev dependencies, see `docs/dependencies.md`) and have Java 21 or newer for `pnpm test:rules`.
- The spec's coverage target for rules ("100% of rule functions exercised") needs the emulator's coverage report; it is not measured yet. The data-driven tests exercise every function, and the report is added when the `rules` job has run green.
- The exact project IDs depend on what Google has free. If `muslimgive-dev`, `-staging` or `-prod` is taken, change `.firebaserc` and spec 19.1 together.
- The spec's outline for sections 12.3 and 12.4 should be updated to match the rules (the three stricter points above).
