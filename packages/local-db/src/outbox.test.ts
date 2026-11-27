import { instantMillis, type Hlc, type Instant } from '@muslim-give/domain';
import type { SqlExecutor } from './executor.js';
import {
  acknowledge,
  BATCH_SIZE,
  enqueue,
  markFailed,
  markPermanentFailure,
  pendingCount,
  PARKED_UNTIL,
  recordChange,
  takeBatch,
  type OutboxEntry,
} from './outbox.js';
import { donationRow, insert, openExecutor, syncRow, type TestDb } from './test-support.js';

const at = (text: string): Instant => text as Instant;
const NOW = at('2027-03-05T00:00:00.000Z');

const entry = (recordId: string, over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  collection: 'donations',
  recordId,
  op: 'upsert',
  hlc: '000000000000001-00000-dev' as Hlc,
  payload: { id: recordId },
  ...over,
});

let db: TestDb;
let executor: SqlExecutor;
beforeEach(() => {
  ({ db, executor } = openExecutor());
});

const sequence = (): number[] => takeBatch(executor, NOW).map((row) => row.seq);

describe('enqueue and coalescing (spec 8.2)', () => {
  it('queues changes in the order they were made', () => {
    enqueue(executor, entry('a'));
    enqueue(executor, entry('b'));
    const rows = takeBatch(executor, NOW);
    expect(rows.map((row) => row.recordId)).toEqual(['a', 'b']);
    expect(rows[0]).toEqual({
      seq: 1,
      collection: 'donations',
      recordId: 'a',
      op: 'upsert',
      hlc: '000000000000001-00000-dev',
      payload: '{"id":"a"}',
      attempts: 0,
      nextAttemptAt: null,
      lastErrorCode: null,
    });
  });
  it('replaces older unsent rows for the same record, so ten edits upload once', () => {
    for (let n = 0; n < 10; n++) enqueue(executor, entry('a', { payload: { n } }));
    const rows = takeBatch(executor, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.payload).toBe('{"n":9}');
  });
  it('keeps rows for different records or collections apart', () => {
    enqueue(executor, entry('a'));
    enqueue(executor, entry('a', { collection: 'receipts' }));
    enqueue(executor, entry('b'));
    expect(pendingCount(executor)).toBe(3);
  });
  it('queues a delete as the latest word on a record', () => {
    enqueue(executor, entry('a'));
    enqueue(executor, entry('a', { op: 'delete', payload: { id: 'a', deleted: 1 } }));
    const rows = takeBatch(executor, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.op).toBe('delete');
  });
  it('starts a replaced row with a clean retry history', () => {
    enqueue(executor, entry('a'));
    const [first] = takeBatch(executor, NOW);
    markFailed(executor, first?.seq ?? 0, 'unavailable', NOW, 0);
    enqueue(executor, entry('a'));
    const [second] = takeBatch(executor, NOW);
    expect(second?.attempts).toBe(0);
    expect(second?.nextAttemptAt).toBe(null);
  });
});

describe('recordChange: the record and its outbox row are one transaction', () => {
  it('keeps both when the write succeeds', () => {
    recordChange(executor, entry('d1'), () => {
      insert(db, 'donations', donationRow('d1'));
    });
    expect(pendingCount(executor)).toBe(1);
    expect(executor.all('select id from donations')).toHaveLength(1);
  });
  it('keeps neither when the record write fails', () => {
    expect(() => {
      recordChange(executor, entry('d1'), () => {
        insert(db, 'donations', donationRow('d1', { amount_minor: 0 }));
      });
    }).toThrow();
    expect(pendingCount(executor)).toBe(0);
    expect(executor.all('select id from donations')).toHaveLength(0);
  });
  it('keeps neither when queuing fails after the record was written', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular; // JSON.stringify refuses this, so queuing fails
    expect(() => {
      recordChange(executor, entry('d1', { payload: circular }), () => {
        insert(db, 'donations', donationRow('d1'));
      });
    }).toThrow();
    expect(executor.all('select id from donations')).toHaveLength(0);
    expect(pendingCount(executor)).toBe(0);
  });
  it('rolls back only the inner step when changes are nested', () => {
    executor.transaction(() => {
      insert(db, 'donations', donationRow('outer'));
      expect(() => {
        recordChange(executor, entry('inner'), () => {
          insert(db, 'donations', donationRow('inner', { amount_minor: 0 }));
        });
      }).toThrow();
    });
    expect(executor.all('select id from donations').map((row) => row.id)).toEqual(['outer']);
    expect(pendingCount(executor)).toBe(0);
  });
});

describe('takeBatch (spec 8.3)', () => {
  it('takes at most 400 rows by default, in order, or the limit given', () => {
    for (let n = 0; n < BATCH_SIZE + 5; n++) enqueue(executor, entry(`r${String(n)}`));
    expect(takeBatch(executor, NOW)).toHaveLength(400);
    expect(sequence().slice(0, 3)).toEqual([1, 2, 3]);
    expect(takeBatch(executor, NOW, 2)).toHaveLength(2);
  });
  it('is empty when nothing is queued', () => {
    expect(takeBatch(executor, NOW)).toEqual([]);
  });
});

describe('acknowledge', () => {
  it('removes acknowledged rows only', () => {
    enqueue(executor, entry('a'));
    enqueue(executor, entry('b'));
    enqueue(executor, entry('c'));
    acknowledge(executor, [1, 3]);
    expect(takeBatch(executor, NOW).map((row) => row.recordId)).toEqual(['b']);
  });
  it('does not remove a newer edit that replaced a row while it was uploading', () => {
    enqueue(executor, entry('a'));
    const inFlight = sequence();
    enqueue(executor, entry('a', { payload: { edited: true } }));
    acknowledge(executor, inFlight);
    const rows = takeBatch(executor, NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.payload).toBe('{"edited":true}');
  });
  it('accepts an empty list and unknown sequence numbers', () => {
    acknowledge(executor, []);
    acknowledge(executor, [99]);
    expect(pendingCount(executor)).toBe(0);
  });
});

describe('markFailed: transient errors back off (spec 8.3)', () => {
  it('counts attempts and waits longer each time, but not past 15 minutes', () => {
    enqueue(executor, entry('a'));
    const waits: number[] = [];
    let now = NOW;
    for (let n = 0; n < 12; n++) {
      const [row] = executor.all('select seq from outbox');
      const result = markFailed(executor, Number(row?.seq), 'unavailable', now, 0.999_999);
      expect(result.ok).toBe(true);
      const [after] = executor.all('select attempts, next_attempt_at, last_error_code from outbox');
      expect(after?.attempts).toBe(n + 1);
      expect(after?.last_error_code).toBe('unavailable');
      const due = at(String(after?.next_attempt_at));
      waits.push(instantMillis(due) - instantMillis(now));
      now = due;
    }
    expect(waits.slice(0, 4)).toEqual([1_999, 3_999, 7_999, 15_999]);
    expect(waits.every((wait, index) => index === 0 || (waits[index - 1] ?? 0) <= wait)).toBe(true);
    expect(Math.max(...waits) < 15 * 60 * 1000).toBe(true);
  });
  it('hides a row until it is due, then offers it again', () => {
    enqueue(executor, entry('a'));
    enqueue(executor, entry('b'));
    markFailed(executor, 1, 'unavailable', NOW, 0);
    expect(takeBatch(executor, NOW).map((row) => row.recordId)).toEqual(['b']);
    expect(takeBatch(executor, at('2027-03-05T00:00:00.999Z')).map((row) => row.recordId)).toEqual([
      'b',
    ]);
    expect(takeBatch(executor, at('2027-03-05T00:00:01.000Z')).map((row) => row.recordId)).toEqual([
      'a',
      'b',
    ]);
  });
  it('does nothing for a row that is already gone', () => {
    expect(markFailed(executor, 42, 'unavailable', NOW, 0)).toEqual({ ok: true, value: undefined });
  });
  it('reports an error instead of scheduling a retry past the supported years', () => {
    enqueue(executor, entry('a'));
    const result = markFailed(executor, 1, 'unavailable', at('9999-12-31T23:59:59.999Z'), 0.5);
    expect(result).toEqual({ ok: false, error: { code: 'date.invalid' } });
    expect(takeBatch(executor, NOW)[0]?.attempts).toBe(0);
  });
});

describe('markPermanentFailure: one bad row never blocks the others', () => {
  it('parks the row, keeps it in the outbox and keeps the error code', () => {
    enqueue(executor, entry('bad'));
    enqueue(executor, entry('good'));
    markPermanentFailure(executor, 1, 'invalid-argument');
    expect(takeBatch(executor, at('9999-01-01T00:00:00.000Z')).map((row) => row.recordId)).toEqual([
      'good',
    ]);
    expect(pendingCount(executor)).toBe(2);
    const [parked] = executor.all(
      'select next_attempt_at, last_error_code from outbox where seq = 1',
    );
    expect(parked?.next_attempt_at).toBe(PARKED_UNTIL);
    expect(parked?.last_error_code).toBe('invalid-argument');
  });
});

describe('pendingCount (spec 8.7: sign-out needs an empty outbox)', () => {
  it('is zero when empty and counts every queued row', () => {
    expect(pendingCount(executor)).toBe(0);
    enqueue(executor, entry('a'));
    enqueue(executor, entry('b'));
    expect(pendingCount(executor)).toBe(2);
    acknowledge(executor, [1, 2]);
    expect(pendingCount(executor)).toBe(0);
  });
});

describe('corrupt rows are reported, never guessed at', () => {
  const corrupt = (row: Record<string, string | number | null>): SqlExecutor => ({
    run: () => undefined,
    all: () => [row],
    transaction: (work) => work(),
  });
  const good = {
    seq: 1,
    collection: 'donations',
    record_id: 'a',
    op: 'upsert',
    hlc: 'h',
    payload: '{}',
    attempts: 0,
    next_attempt_at: null,
    last_error_code: null,
  };
  it('accepts a well-formed row', () => {
    expect(takeBatch(corrupt(good), NOW)).toHaveLength(1);
    expect(
      takeBatch(corrupt({ ...good, next_attempt_at: 'x', last_error_code: 'e' }), NOW),
    ).toHaveLength(1);
  });
  it('throws on a wrong type, an unknown operation or a missing column', () => {
    for (const bad of [
      { ...good, seq: 'one' },
      { ...good, collection: 5 },
      { ...good, op: 'merge' },
      { ...good, attempts: null },
      { ...good, next_attempt_at: 5 },
    ]) {
      expect(() => takeBatch(corrupt(bad), NOW)).toThrow('outbox.corrupt_row');
    }
    const missing = { ...good, payload: undefined } as unknown as Record<
      string,
      string | number | null
    >;
    expect(() => takeBatch(corrupt(missing), NOW)).toThrow('outbox.corrupt_row');
    expect(() => pendingCount(corrupt({ n: 'two' }))).toThrow('outbox.corrupt_row');
  });
  it('leaves unrelated tables alone', () => {
    insert(db, 'profile', { ...syncRow('profile'), home_country_code: 'SG', home_currency: 'SGD' });
    expect(pendingCount(executor)).toBe(0);
  });
});
