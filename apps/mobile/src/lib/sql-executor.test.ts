import type { SqlValue } from '@muslim-give/local-db';
import { createSqlExecutor, type SyncSqlPort } from './sql-executor';

function fakePort(rows: readonly Record<string, SqlValue>[] = []): {
  readonly port: SyncSqlPort;
  readonly log: string[];
} {
  const log: string[] = [];
  const port: SyncSqlPort = {
    exec: (sql) => {
      log.push(sql);
    },
    run: (sql, params) => {
      log.push(`${sql} [${params.join(',')}]`);
    },
    all: (sql, params) => {
      log.push(`${sql} [${params.join(',')}]`);
      return rows;
    },
  };
  return { port, log };
}

describe('createSqlExecutor', () => {
  it('passes statements and parameters through, defaulting to none', () => {
    const { port, log } = fakePort([{ id: 'a' }]);
    const db = createSqlExecutor(port);
    db.run('insert into t values (?)', ['x']);
    db.run('delete from t');
    expect(db.all('select * from t where id = ?', ['a'])).toEqual([{ id: 'a' }]);
    expect(db.all('select * from t')).toEqual([{ id: 'a' }]);
    expect(log).toEqual([
      'insert into t values (?) [x]',
      'delete from t []',
      'select * from t where id = ? [a]',
      'select * from t []',
    ]);
  });

  it('wraps the outermost call in BEGIN and COMMIT and returns its result', () => {
    const { port, log } = fakePort();
    const db = createSqlExecutor(port);
    expect(db.transaction(() => 42)).toBe(42);
    expect(log).toEqual(['BEGIN IMMEDIATE', 'COMMIT']);
  });

  it('rolls the outermost call back and rethrows', () => {
    const { port, log } = fakePort();
    const db = createSqlExecutor(port);
    expect(() =>
      db.transaction(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(log).toEqual(['BEGIN IMMEDIATE', 'ROLLBACK']);
  });

  it('uses savepoints for nested calls and lets the outer call carry on after an inner failure', () => {
    const { port, log } = fakePort();
    const db = createSqlExecutor(port);
    db.transaction(() => {
      db.transaction(() => 1);
      try {
        db.transaction(() => {
          throw new Error('inner');
        });
      } catch {
        // The inner failure is handled; the outer transaction continues.
      }
    });
    expect(log).toEqual([
      'BEGIN IMMEDIATE',
      'SAVEPOINT sp_1',
      'RELEASE sp_1',
      'SAVEPOINT sp_1',
      'ROLLBACK TO sp_1; RELEASE sp_1',
      'COMMIT',
    ]);
  });

  it('starts a fresh BEGIN after a failed transaction', () => {
    const { port, log } = fakePort();
    const db = createSqlExecutor(port);
    expect(() =>
      db.transaction(() => {
        throw new Error('x');
      }),
    ).toThrow('x');
    db.transaction(() => 0);
    expect(log).toEqual(['BEGIN IMMEDIATE', 'ROLLBACK', 'BEGIN IMMEDIATE', 'COMMIT']);
  });
});
