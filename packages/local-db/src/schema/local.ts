import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { oneOf } from './helpers.js';

/** Local-only tables: never synced, never in Firestore (spec 7.5). */

export const outbox = sqliteTable(
  'outbox',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    collection: text('collection').notNull(),
    recordId: text('record_id').notNull(),
    op: text('op').notNull(),
    hlc: text('hlc').notNull(),
    payload: text('payload').notNull(),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: text('next_attempt_at'),
    lastErrorCode: text('last_error_code'),
  },
  (t) => [
    check('outbox_op', oneOf(t.op, ['upsert', 'delete'])),
    check('outbox_attempts', sql`${t.attempts} >= 0`),
    index('outbox_record_idx').on(t.collection, t.recordId),
    index('outbox_due_idx').on(t.nextAttemptAt),
  ],
);

export const syncState = sqliteTable('sync_state', {
  collection: text('collection').primaryKey(),
  cursor: text('cursor'),
  lastSuccessAt: text('last_success_at'),
});

export const refCache = sqliteTable('ref_cache', {
  listId: text('list_id').primaryKey(),
  version: integer('version').notNull(),
  items: text('items').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const officialDatesCache = sqliteTable('official_dates_cache', {
  key: text('key').primaryKey(),
  events: text('events').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const notificationSchedule = sqliteTable('notification_schedule', {
  key: text('key').primaryKey(),
  notificationId: text('notification_id').notNull(),
  fireAt: text('fire_at').notNull(),
});

/** One row: this install's identity and hybrid logical clock state. */
export const device = sqliteTable(
  'device',
  {
    id: text('id').primaryKey(),
    installId: text('install_id').notNull(),
    hlcMillis: integer('hlc_millis').notNull().default(0),
    hlcCounter: integer('hlc_counter').notNull().default(0),
  },
  (t) => [check('device_singleton', sql`${t.id} = 'device'`)],
);
