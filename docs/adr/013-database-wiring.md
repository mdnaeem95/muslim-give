# ADR 013: database wiring and migrations

- Status: accepted
- Date: 2026-11-27

## Context

Spec 7.7 requires the app to open its SQLite database and migrate it before the first screen, taking a backup first and restoring it if a migration fails. `drizzle-kit` writes the migrations as `.sql` files, which Metro cannot import.

## Decisions

1. **The runner is pure and lives in `packages/local-db`.** `runMigrations(db, migrations, backup, now)` works over the `SqlExecutor` and a `BackupPort`, so every outcome is tested on Node's SQLite with no device. It returns a value, never throws for an expected failure (spec 6.3).
2. **Our own history table.** `__drizzle_migrations` records each applied tag and when. The runner, not Drizzle's migrator, applies them, because the backup, restore and error codes are ours.
3. **One transaction for all pending migrations.** SQLite rolls back schema changes too, so a failure leaves the database as it was. The backup is a second line of defence.
4. **No backup on a fresh install.** There is nothing to lose. Otherwise the copy is named by the number of migrations already applied, and if it cannot be made nothing is changed.
5. **Newer or different history is refused, untouched.** A database with more applied migrations than the app knows (a downgrade) gives `db.newer_than_app`; any other difference gives `db.history_mismatch`. The app shows "Please update the app" for the first.
6. **A generated module carries the SQL.** `scripts/generate-migrations.mjs` turns `migrations/*.sql` into `src/migrations.generated.ts`. `pnpm --filter @muslim-give/local-db db:generate` runs it after `drizzle-kit generate`, and a test fails if the module is stale.
7. **Backups use SQLite's backup API.** `expo-sqlite`'s `backupDatabaseSync` copies to a sibling `backup-v<N>.db`, so a copy is always a consistent database. Copies are deleted once the app is running.

## Consequences

- Adding a migration is: edit the schema, run `db:generate`, commit the SQL, the snapshot and the generated module.
- The Expo adapter (`apps/mobile/src/data`) is checked by typecheck and a device run; its transaction logic is the tested `createSqlExecutor`.
- Restore replaces the open database's contents through the backup API. This path is only exercised on a device, and needs a deliberately broken migration to prove it there.
