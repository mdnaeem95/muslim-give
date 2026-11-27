import type { BackupPort } from '@muslim-give/local-db';
import {
  backupDatabaseSync,
  deleteDatabaseAsync,
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { logger } from '../observability/logger';

const backupName = (version: number): string => `backup-v${String(version)}.db`;

/**
 * Pre-migration copies of the database, kept as sibling SQLite files and made with SQLite's own
 * backup API, so a copy is always a consistent database (spec 7.7). `latestVersion` is the number
 * of migrations this app knows, which bounds the copies there can be.
 */
export function createFileBackup(main: SQLiteDatabase, latestVersion: number): BackupPort {
  const copy = (from: SQLiteDatabase, to: SQLiteDatabase): void => {
    backupDatabaseSync({ sourceDatabase: from, destDatabase: to });
  };
  return {
    create: (version) => {
      const target = openDatabaseSync(backupName(version));
      try {
        copy(main, target);
      } finally {
        target.closeSync();
      }
    },
    restore: (version) => {
      const source = openDatabaseSync(backupName(version));
      try {
        copy(source, main);
      } finally {
        source.closeSync();
      }
    },
    discardAll: () => {
      for (let version = 1; version <= latestVersion; version++) {
        deleteDatabaseAsync(backupName(version)).catch(() => {
          // Most versions have no copy, so a failed delete is normal and not worth a warning.
          logger.debug('db.backup_discard_skipped');
        });
      }
    },
  };
}
