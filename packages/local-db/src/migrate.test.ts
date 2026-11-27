import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Instant } from '@muslim-give/domain';
import { finishLaunch, runMigrations, type BackupPort, type Migration } from './migrate.js';
import { MIGRATIONS } from './migrations.generated.js';
import { executorFor, openMigratedDb, openRawDb } from './test-support.js';

const NOW = '2027-03-05T00:00:00.000Z' as Instant;

const m1: Migration = { tag: '0000_a', statements: ['create table a (id integer primary key)'] };
const m2: Migration = {
  tag: '0001_b',
  statements: ['create table b (id integer primary key)', 'insert into b (id) values (1)'],
};
const bad: Migration = {
  tag: '0002_bad',
  statements: ['create table c (id integer primary key)', 'insert into nowhere (id) values (1)'],
};

interface Recorder extends BackupPort {
  readonly calls: string[];
}

function recorder(options: { createFails?: boolean; restoreFails?: boolean } = {}): Recorder {
  const calls: string[] = [];
  return {
    calls,
    create: (version) => {
      if (options.createFails === true) throw new Error('disk full');
      calls.push(`create:${String(version)}`);
    },
    restore: (version) => {
      if (options.restoreFails === true) throw new Error('no backup');
      calls.push(`restore:${String(version)}`);
    },
    discardAll: () => {
      calls.push('discard');
    },
  };
}

const tables = (db: ReturnType<typeof openRawDb>): string[] =>
  db
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .all()
    .map((row) => String(row.name));

const history = (db: ReturnType<typeof openRawDb>): string[] =>
  db
    .prepare('select tag, applied_at from __drizzle_migrations order by rowid')
    .all()
    .map((row) => `${String(row.tag)}@${String(row.applied_at)}`);

describe('runMigrations', () => {
  it('applies everything to a fresh database without a backup', () => {
    const db = openRawDb();
    const backup = recorder();
    const result = runMigrations(executorFor(db), [m1, m2], backup, NOW);
    expect(result).toEqual({ ok: true, value: { applied: ['0000_a', '0001_b'], version: 2 } });
    expect(backup.calls).toEqual([]);
    expect(tables(db)).toContain('a');
    expect(tables(db)).toContain('b');
    expect(tables(db)).toContain('__drizzle_migrations');
    expect(history(db)).toEqual(['0000_a@' + NOW, '0001_b@' + NOW]);
  });

  it('does nothing and takes no backup when already up to date', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1, m2], recorder(), NOW);
    const backup = recorder();
    const again = runMigrations(executorFor(db), [m1, m2], backup, NOW);
    expect(again).toEqual({ ok: true, value: { applied: [], version: 2 } });
    expect(backup.calls).toEqual([]);
  });

  it('backs up at the current version, then applies only the pending migrations', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1], recorder(), NOW);
    const backup = recorder();
    const result = runMigrations(executorFor(db), [m1, m2], backup, NOW);
    expect(result).toEqual({ ok: true, value: { applied: ['0001_b'], version: 2 } });
    expect(backup.calls).toEqual(['create:1']);
  });

  it('rolls the whole run back when one migration fails, then restores the backup', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1], recorder(), NOW);
    const backup = recorder();
    const result = runMigrations(executorFor(db), [m1, m2, bad], backup, NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.migration_failed', tag: '0002_bad' } });
    expect(backup.calls).toEqual(['create:1', 'restore:1']);
    expect(tables(db)).not.toContain('b');
    expect(tables(db)).not.toContain('c');
    expect(history(db)).toEqual(['0000_a@' + NOW]);
  });

  it('reports a failure on a fresh database without a restore', () => {
    const db = openRawDb();
    const backup = recorder();
    const result = runMigrations(executorFor(db), [bad], backup, NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.migration_failed', tag: '0002_bad' } });
    expect(backup.calls).toEqual([]);
    expect(tables(db)).not.toContain('c');
  });

  it('leaves the database untouched when the backup cannot be taken', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1], recorder(), NOW);
    const result = runMigrations(executorFor(db), [m1, m2], recorder({ createFails: true }), NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.backup_failed' } });
    expect(tables(db)).not.toContain('b');
  });

  it('says so when the restore itself fails', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1], recorder(), NOW);
    const result = runMigrations(executorFor(db), [m1, bad], recorder({ restoreFails: true }), NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.restore_failed', tag: '0002_bad' } });
  });

  it('refuses a database written by a newer app, untouched', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1, m2], recorder(), NOW);
    const backup = recorder();
    const result = runMigrations(executorFor(db), [m1], backup, NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.newer_than_app' } });
    expect(backup.calls).toEqual([]);
  });

  it('refuses a history that does not match the known migrations', () => {
    const db = openRawDb();
    runMigrations(executorFor(db), [m1], recorder(), NOW);
    const other: Migration = { tag: '0000_other', statements: [] };
    const result = runMigrations(executorFor(db), [other, m2], recorder(), NOW);
    expect(result).toEqual({ ok: false, error: { code: 'db.history_mismatch' } });
  });
});

describe('finishLaunch', () => {
  it('discards the pre-migration copies', () => {
    const backup = recorder();
    finishLaunch(backup);
    expect(backup.calls).toEqual(['discard']);
  });
});

describe('the checked-in migrations', () => {
  const schemaOf = (db: ReturnType<typeof openRawDb>): unknown[] =>
    db
      .prepare(
        "select type, name, sql from sqlite_master where name not like 'sqlite_%' and name != '__drizzle_migrations' order by type, name",
      )
      .all();

  it('build the same schema through the runner as through plain execution', () => {
    const viaRunner = openRawDb();
    const result = runMigrations(executorFor(viaRunner), MIGRATIONS, recorder(), NOW);
    expect(result.ok).toBe(true);
    expect(schemaOf(viaRunner)).toEqual(schemaOf(openMigratedDb()));
  });

  it('are in sync with the files drizzle-kit wrote (run `pnpm db:generate`)', () => {
    const dir = join(import.meta.dirname, '..', 'migrations');
    const journal = JSON.parse(readFileSync(join(dir, 'meta', '_journal.json'), 'utf8')) as {
      entries: { tag: string }[];
    };
    const expected = journal.entries.map((entry) => ({
      tag: entry.tag,
      statements: readFileSync(join(dir, `${entry.tag}.sql`), 'utf8')
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0),
    }));
    expect(MIGRATIONS).toEqual(expected);
  });
});
