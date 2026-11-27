import {
  addMillis,
  retryDelayMillis,
  type AppError,
  type Hlc,
  type Instant,
  type Result,
  ok,
} from '@muslim-give/domain';
import type { SqlExecutor, SqlValue } from './executor.js';

/** Spec 8.3: at most 400 rows per batch (Firestore allows 500 writes). */
export const BATCH_SIZE = 400;

/**
 * A row that must never be retried automatically (a permanent validation error, spec 8.3) is parked
 * at this instant. It stays in the outbox, so sign-out stays blocked until a fixed release handles
 * it, but it never blocks other rows.
 */
export const PARKED_UNTIL = '9999-12-31T23:59:59.999Z';

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  readonly collection: string;
  readonly recordId: string;
  readonly op: OutboxOp;
  readonly hlc: Hlc;
  /** The whole record as it should look remotely. */
  readonly payload: Record<string, unknown>;
}

export interface OutboxRow {
  readonly seq: number;
  readonly collection: string;
  readonly recordId: string;
  readonly op: OutboxOp;
  readonly hlc: string;
  readonly payload: string;
  readonly attempts: number;
  readonly nextAttemptAt: string | null;
  readonly lastErrorCode: string | null;
}

/**
 * Queues a change for upload. Any older unsent row for the same record is deleted first, so ten
 * edits upload once (spec 8.2). Call it inside the same transaction as the record change.
 */
export function enqueue(db: SqlExecutor, entry: OutboxEntry): void {
  db.transaction(() => {
    db.run('delete from outbox where collection = ? and record_id = ?', [
      entry.collection,
      entry.recordId,
    ]);
    db.run('insert into outbox (collection, record_id, op, hlc, payload) values (?, ?, ?, ?, ?)', [
      entry.collection,
      entry.recordId,
      entry.op,
      entry.hlc,
      JSON.stringify(entry.payload),
    ]);
  });
}

/**
 * Writes a record change and queues its upload in one transaction, always, even while the user is
 * a guest (spec 8.2). If either step fails, neither is kept.
 */
export function recordChange(db: SqlExecutor, entry: OutboxEntry, writeRecord: () => void): void {
  db.transaction(() => {
    writeRecord();
    enqueue(db, entry);
  });
}

const text = (value: SqlValue | undefined): string => {
  if (typeof value !== 'string') throw new Error('outbox.corrupt_row');
  return value;
};

const whole = (value: SqlValue | undefined): number => {
  if (typeof value !== 'number') throw new Error('outbox.corrupt_row');
  return value;
};

const nullableText = (value: SqlValue | undefined): string | null =>
  value === null ? null : text(value);

function toRow(raw: Record<string, SqlValue>): OutboxRow {
  const op = text(raw.op);
  if (op !== 'upsert' && op !== 'delete') throw new Error('outbox.corrupt_row');
  return {
    seq: whole(raw.seq),
    collection: text(raw.collection),
    recordId: text(raw.record_id),
    op,
    hlc: text(raw.hlc),
    payload: text(raw.payload),
    attempts: whole(raw.attempts),
    nextAttemptAt: nullableText(raw.next_attempt_at),
    lastErrorCode: nullableText(raw.last_error_code),
  };
}

/** Rows due for upload at `now`, oldest first. Rows waiting out a backoff or parked are skipped. */
export function takeBatch(db: SqlExecutor, now: Instant, limit = BATCH_SIZE): OutboxRow[] {
  return db
    .all(
      `select * from outbox
       where next_attempt_at is null or next_attempt_at <= ?
       order by seq limit ?`,
      [now, limit],
    )
    .map(toRow);
}

/** Removes rows Firestore has acknowledged. Rows replaced by a newer edit meanwhile stay. */
export function acknowledge(db: SqlExecutor, seqs: readonly number[]): void {
  db.transaction(() => {
    for (const seq of seqs) db.run('delete from outbox where seq = ?', [seq]);
  });
}

/**
 * Records a transient failure and schedules the next try (2 s, 4 s ... capped at 15 minutes, with
 * jitter). `random` is in [0, 1). Fails only if the next try would fall outside the supported years.
 */
export function markFailed(
  db: SqlExecutor,
  seq: number,
  errorCode: string,
  now: Instant,
  random: number,
): Result<void, AppError> {
  const [current] = db.all('select attempts from outbox where seq = ?', [seq]);
  if (current === undefined) return ok(undefined);
  const attempts = whole(current.attempts) + 1;
  const next = addMillis(now, retryDelayMillis(attempts, random));
  if (!next.ok) return next;
  db.run('update outbox set attempts = ?, next_attempt_at = ?, last_error_code = ? where seq = ?', [
    attempts,
    next.value,
    errorCode,
    seq,
  ]);
  return ok(undefined);
}

/** Parks a row that failed validation for good; other rows carry on (spec 8.3). */
export function markPermanentFailure(db: SqlExecutor, seq: number, errorCode: string): void {
  db.run('update outbox set next_attempt_at = ?, last_error_code = ? where seq = ?', [
    PARKED_UNTIL,
    errorCode,
    seq,
  ]);
}

/** Sign-out is allowed only when nothing is waiting to upload (spec 8.7). */
export function pendingCount(db: SqlExecutor): number {
  return db.all('select count(*) as n from outbox').reduce((total, row) => total + whole(row.n), 0);
}
