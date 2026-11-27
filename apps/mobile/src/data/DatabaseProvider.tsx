import {
  finishLaunch,
  MIGRATIONS,
  runMigrations,
  type BackupPort,
  type MigrationError,
  type SqlExecutor,
} from '@muslim-give/local-db';
import { openDatabaseAsync } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '../i18n';
import { createSqlExecutor } from '../lib/sql-executor';
import { logger } from '../observability/logger';
import { readSystemInstant } from '../platform/system-clock';
import { AppText } from '../ui/AppText';
import { createFileBackup } from './expo-backup';
import { createExpoPort } from './expo-port';

const DATABASE_NAME = 'muslim-give.db';

type State =
  | { readonly status: 'opening' }
  | { readonly status: 'ready'; readonly db: SqlExecutor; readonly backup: BackupPort }
  | { readonly status: 'failed'; readonly newerThanApp: boolean };

const DatabaseContext = createContext<SqlExecutor | null>(null);

/**
 * Opens the local database and migrates it before any screen that needs data renders (spec 7.7).
 * A database from a newer app is left untouched and the person is asked to update; any other
 * failure shows a calm message. Only error codes are logged.
 */
export function DatabaseProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const [state, setState] = useState<State>({ status: 'opening' });

  useEffect(() => {
    let cancelled = false;
    const open = async (): Promise<void> => {
      const raw = await openDatabaseAsync(DATABASE_NAME);
      await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const db = createSqlExecutor(createExpoPort(raw));
      const backup = createFileBackup(raw, MIGRATIONS.length);
      const result = runMigrations(db, MIGRATIONS, backup, readSystemInstant());
      if (cancelled) return;
      if (result.ok) {
        setState({ status: 'ready', db, backup });
        return;
      }
      const error: MigrationError = result.error;
      logger.error('db.open_failed', { code: error.code });
      setState({ status: 'failed', newerThanApp: error.code === 'db.newer_than_app' });
    };
    open().catch((error: unknown) => {
      logger.failure('db.open_failed', error);
      if (!cancelled) setState({ status: 'failed', newerThanApp: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The pre-migration copies are only needed while migrating; drop them once the app is running.
  const readyBackup = state.status === 'ready' ? state.backup : null;
  useEffect(() => {
    if (readyBackup !== null) finishLaunch(readyBackup);
  }, [readyBackup]);

  if (state.status === 'ready') {
    return <DatabaseContext.Provider value={state.db}>{children}</DatabaseContext.Provider>;
  }
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      {state.status === 'opening' ? (
        <AppText muted>{t('db.opening')}</AppText>
      ) : (
        <>
          <AppText variant="heading">
            {t(state.newerThanApp ? 'db.newer.title' : 'db.failed.title')}
          </AppText>
          <AppText>{t(state.newerThanApp ? 'db.newer.body' : 'db.failed.body')}</AppText>
        </>
      )}
    </View>
  );
}

export function useDatabase(): SqlExecutor {
  const db = useContext(DatabaseContext);
  if (db === null) throw new Error('db.missing_provider');
  return db;
}
