import type { AppError, Instant, Result } from '@muslim-give/domain';
import { err, ok } from '@muslim-give/domain';
import type { SqlExecutor } from './executor.js';

/** One migration: a tag (its file name) and its SQL as single statements, in order. */
export interface Migration {
  readonly tag: string;
  readonly statements: readonly string[];
}

/**
 * A copy of the database taken before a migration (spec 7.7). The app implements it with files;
 * tests use a recorder. `version` is the number of migrations already applied.
 */
export interface BackupPort {
  create(version: number): void;
  restore(version: number): void;
  discardAll(): void;
}

export interface MigrationError extends AppError {
  readonly code:
    | 'db.newer_than_app'
    | 'db.history_mismatch'
    | 'db.backup_failed'
    | 'db.migration_failed'
    | 'db.restore_failed';
  /** The migration that failed, where one did. Developer-chosen, never user data. */
  readonly tag?: string;
}

export interface MigrationReport {
  /** Tags applied by this run, in order. Empty when the database was already up to date. */
  readonly applied: readonly string[];
  /** Total migrations applied once the run is done. */
  readonly version: number;
}

const HISTORY_TABLE = '__drizzle_migrations';

const fail = (code: MigrationError['code'], tag?: string): Result<never, MigrationError> =>
  err(tag === undefined ? { code } : { code, tag });

/**
 * Brings the database up to the newest migration, before the first screen renders (spec 7.7).
 *
 * - A fresh database is migrated with no backup (there is nothing to lose).
 * - Otherwise a backup is taken first; if it cannot be taken, nothing is changed.
 * - All pending migrations run in one transaction, so a failure leaves the database as it was;
 *   the backup is then restored as a second line of defence.
 * - A database written by a newer app, or whose history does not match, is refused untouched.
 */
export function runMigrations(
  db: SqlExecutor,
  migrations: readonly Migration[],
  backup: BackupPort,
  now: Instant,
): Result<MigrationReport, MigrationError> {
  db.run(
    `create table if not exists ${HISTORY_TABLE} (tag text primary key not null, applied_at text not null)`,
  );
  const applied = db
    .all(`select tag from ${HISTORY_TABLE} order by rowid`)
    .map((row) => String(row.tag));

  const known = migrations.map((migration) => migration.tag);
  const overlap = Math.min(applied.length, known.length);
  const prefixMatches = applied.slice(0, overlap).every((tag, index) => tag === known[index]);
  if (!prefixMatches) return fail('db.history_mismatch');
  if (applied.length > known.length) return fail('db.newer_than_app');

  const pending = migrations.slice(applied.length);
  if (pending.length === 0) return ok({ applied: [], version: applied.length });

  if (applied.length > 0) {
    try {
      backup.create(applied.length);
    } catch {
      return fail('db.backup_failed');
    }
  }

  let current: string | undefined;
  try {
    db.transaction(() => {
      for (const migration of pending) {
        current = migration.tag;
        for (const statement of migration.statements) db.run(statement);
        db.run(`insert into ${HISTORY_TABLE} (tag, applied_at) values (?, ?)`, [
          migration.tag,
          now,
        ]);
      }
    });
  } catch {
    if (applied.length > 0) {
      try {
        backup.restore(applied.length);
      } catch {
        return fail('db.restore_failed', current);
      }
    }
    return fail('db.migration_failed', current);
  }
  return ok({ applied: pending.map((migration) => migration.tag), version: known.length });
}

/** Call once the app has launched and worked: the pre-migration copies are no longer needed. */
export function finishLaunch(backup: BackupPort): void {
  backup.discardAll();
}
