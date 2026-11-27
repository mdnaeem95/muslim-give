/** A value SQLite stores. */
export type SqlValue = string | number | null;

/**
 * The small slice of a SQLite connection the data layer needs. The app implements it over
 * `expo-sqlite`; tests implement it over `node:sqlite`. Keeping it this narrow lets the outbox and
 * repositories be tested in Node with no device.
 */
export interface SqlExecutor {
  run(sql: string, params?: readonly SqlValue[]): void;
  all(sql: string, params?: readonly SqlValue[]): readonly Record<string, SqlValue>[];
  /** Runs `work` atomically: it all happens or none of it does. Calls may be nested. */
  transaction<T>(work: () => T): T;
}
