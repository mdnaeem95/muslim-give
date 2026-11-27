import type { SqlExecutor, SqlValue } from '@muslim-give/local-db';

/** The few synchronous calls a SQLite driver must offer. `expo-sqlite` provides all three. */
export interface SyncSqlPort {
  exec(sql: string): void;
  run(sql: string, params: readonly SqlValue[]): void;
  all(sql: string, params: readonly SqlValue[]): readonly Record<string, SqlValue>[];
}

/**
 * Builds the data layer's SqlExecutor over a driver. The outermost `transaction` is a real
 * BEGIN/COMMIT; nested ones are savepoints, so a failure inside an inner call undoes only that
 * call (spec 7.7). An error always rolls back and is rethrown unchanged.
 */
export function createSqlExecutor(port: SyncSqlPort): SqlExecutor {
  let depth = 0;
  return {
    run: (sql, params = []) => {
      port.run(sql, params);
    },
    all: (sql, params = []) => port.all(sql, params),
    transaction: (work) => {
      const savepoint = `sp_${String(depth)}`;
      port.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${savepoint}`);
      depth++;
      try {
        const result = work();
        depth--;
        port.exec(depth === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
        return result;
      } catch (error) {
        depth--;
        port.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
        throw error;
      }
    },
  };
}
