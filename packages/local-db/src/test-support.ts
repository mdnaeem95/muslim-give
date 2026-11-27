import type { SqlExecutor } from './executor.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type SqlValue = string | number | null;

/** The part of node:sqlite these tests use. */
export interface TestDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: SqlValue[]): unknown;
    all(...params: SqlValue[]): Record<string, SqlValue>[];
  };
}

interface SqliteModule {
  DatabaseSync: new (path: string) => TestDb;
}

const migrationsDir = join(import.meta.dirname, '..', 'migrations');

/**
 * A fresh in-memory database with every checked-in migration applied in order, the way the app
 * applies them on launch. Jest cannot import `node:sqlite` directly, hence getBuiltinModule.
 */
export function openMigratedDb(): TestDb {
  const sqlite = process.getBuiltinModule('node:sqlite') as SqliteModule;
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const file of files) db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  return db;
}

/** Inserts one row; keys are column names. */
export function insert(db: TestDb, table: string, row: Record<string, SqlValue>): void {
  const columns = Object.keys(row);
  const marks = columns.map(() => '?').join(', ');
  const names = columns.map((c) => `"${c}"`).join(', ');
  db.prepare(`insert into "${table}" (${names}) values (${marks})`).run(...Object.values(row));
}

const NOW = '2027-03-05T00:00:00.000Z';

export const syncRow = (id: string): Record<string, SqlValue> => ({
  id,
  created_at: NOW,
  updated_at: NOW,
  hlc: `1-0-device`,
});

export const donationRow = (
  id: string,
  over: Record<string, SqlValue> = {},
): Record<string, SqlValue> => ({
  ...syncRow(id),
  date: '2027-03-05',
  amount_minor: 1250,
  currency: 'SGD',
  country_code: 'SG',
  category: 'individual',
  recipient_name: 'Aisyah',
  relationship: 'kids',
  occasion: 'birthday',
  giving_type: 'hadiah',
  on_behalf: 'self',
  source: 'manual',
  ...over,
});

export const ruleRow = (
  id: string,
  over: Record<string, SqlValue> = {},
): Record<string, SqlValue> => ({
  ...syncRow(id),
  category: 'mosque',
  recipient_name: 'Masjid Sultan',
  occasion: 'none',
  giving_type: 'sadaqah',
  on_behalf: 'self',
  amount_minor: 5000,
  currency: 'SGD',
  country_code: 'SG',
  day_of_month: 31,
  start_month: '2027-01',
  mode: 'auto',
  ...over,
});

/** The name of the constraint SQLite names in its error, or the raw message. */
export function failureOf(action: () => void): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'accepted';
}

/**
 * A SqlExecutor over an in-memory database with every migration applied, for outbox and
 * repository tests. Nested transactions use savepoints, as the app's adapter must.
 */
export function openExecutor(): { readonly db: TestDb; readonly executor: SqlExecutor } {
  const db = openMigratedDb();
  let depth = 0;
  const executor: SqlExecutor = {
    run: (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    all: (sql, params = []) => db.prepare(sql).all(...params),
    transaction: (work) => {
      const name = `sp_${String(depth)}`;
      db.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${name}`);
      depth++;
      try {
        const result = work();
        depth--;
        db.exec(depth === 0 ? 'COMMIT' : `RELEASE ${name}`);
        return result;
      } catch (error) {
        depth--;
        db.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${name}; RELEASE ${name}`);
        throw error;
      }
    },
  };
  return { db, executor };
}
