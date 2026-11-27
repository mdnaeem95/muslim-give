import type { SqlValue } from '@muslim-give/local-db';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncSqlPort } from '../lib/sql-executor';

/** Connects the data layer to expo-sqlite's synchronous API. */
export function createExpoPort(db: SQLiteDatabase): SyncSqlPort {
  return {
    exec: (sql) => {
      db.execSync(sql);
    },
    run: (sql, params) => {
      db.runSync(sql, [...params]);
    },
    all: (sql, params) => db.getAllSync<Record<string, SqlValue>>(sql, [...params]),
  };
}
