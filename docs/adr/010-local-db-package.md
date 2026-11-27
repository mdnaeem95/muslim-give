# ADR 010: the local database lives in `packages/local-db`

- Status: accepted
- Date: 2026-11-27

## Context

Spec 6.1 places the Drizzle schema and migrations under `apps/mobile/src/data/db`. That folder cannot be tested without the app shell and a device, yet the schema carries many business rules (CHECK constraints, unique indexes, singletons) that must be proven early.

## Decision

The Drizzle table definitions and generated migrations live in `packages/local-db`, a package with no React Native imports. The mobile app will import it. Tests apply the checked-in migrations to an in-memory SQLite database (Node's built-in `node:sqlite`) and prove that the database refuses what the domain refuses.

## Consequences

- Schema rules are tested in CI on every PR, before any UI exists.
- Migrations are generated with `drizzle-kit generate` and committed; they are never edited by hand after release.
- CHECK lists are built from `packages/domain` vocabulary, so a new code cannot be added to the domain and forgotten in the database. A test inserts every domain code.
- The sync, repository and migration-runner code that touches `expo-sqlite` stays in `apps/mobile`.
- Spec 6.1 should be updated to show the package.
