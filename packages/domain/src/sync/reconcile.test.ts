import { occurrenceId } from '../recurring.js';
import { d, mk } from '../test-support.js';
import {
  reconcile,
  type DonationFacts,
  type EidPersonFacts,
  type OccurrenceFacts,
  type ReceiptFacts,
  type ReconcileFix,
  type ReconcileSnapshot,
} from './reconcile.js';

const donation = (id: string, over: Partial<DonationFacts> = {}): DonationFacts => ({
  id,
  deleted: false,
  date: d('2027-03-05'),
  amountMinor: 5000,
  currency: 'SGD',
  recurringRuleId: null,
  occurrenceMonth: null,
  eidPersonId: null,
  ...over,
});
const person = (id: string, over: Partial<EidPersonFacts> = {}): EidPersonFacts => ({
  id,
  deleted: false,
  donationId: null,
  ...over,
});
const occurrence = (
  ruleId: string,
  month: string,
  over: Partial<OccurrenceFacts> = {},
): OccurrenceFacts => ({
  id: occurrenceId(ruleId, mk(month)),
  deleted: false,
  ruleId,
  month: mk(month),
  status: 'logged',
  donationId: null,
  ...over,
});
const receipt = (id: string, donationId: string, deleted = false): ReceiptFacts => ({
  id,
  deleted,
  donationId,
});
const snapshot = (over: Partial<ReconcileSnapshot> = {}): ReconcileSnapshot => ({
  donations: [],
  eidPeople: [],
  occurrences: [],
  receipts: [],
  ...over,
});

describe('spec 8.6 invariants', () => {
  it('finds nothing to fix in consistent data', () => {
    const s = snapshot({
      donations: [
        donation('don_eid_p1', { eidPersonId: 'p1' }),
        donation('don_occ_r1_2027-03', { recurringRuleId: 'r1', occurrenceMonth: mk('2027-03') }),
      ],
      eidPeople: [person('p1', { donationId: 'don_eid_p1' }), person('p2')],
      occurrences: [occurrence('r1', '2027-03', { donationId: 'don_occ_r1_2027-03' })],
      receipts: [receipt('rc1', 'don_eid_p1')],
    });
    expect(reconcile(s)).toEqual([]);
  });

  it('1: an Eid person marked given with a deleted or missing donation shows as not given', () => {
    const s = snapshot({
      donations: [donation('gone', { deleted: true })],
      eidPeople: [
        person('p1', { donationId: 'gone' }),
        person('p2', { donationId: 'never-existed' }),
        person('p3', { donationId: 'gone', deleted: true }),
      ],
    });
    expect(reconcile(s)).toEqual([
      { kind: 'clear_person_donation', personId: 'p1' },
      { kind: 'clear_person_donation', personId: 'p2' },
    ]);
  });

  it('2: a gift whose Eid person was deleted keeps the gift and loses the link', () => {
    const s = snapshot({
      donations: [
        donation('d1', { eidPersonId: 'p1' }),
        donation('d2', { eidPersonId: 'missing' }),
        donation('d3', { eidPersonId: 'p3' }),
        donation('d4', { eidPersonId: 'p1', deleted: true }),
      ],
      eidPeople: [person('p1', { deleted: true }), person('p3')],
    });
    expect(reconcile(s)).toEqual([
      { kind: 'unlink_eid_donation', donationId: 'd1' },
      { kind: 'unlink_eid_donation', donationId: 'd2' },
    ]);
  });

  it('3: a logged occurrence with no live donation becomes declined', () => {
    const live = donation('d1');
    const s = snapshot({
      donations: [live, donation('d2', { deleted: true })],
      occurrences: [
        occurrence('r1', '2027-01', { donationId: 'd1' }),
        occurrence('r1', '2027-02', { donationId: 'd2' }),
        occurrence('r1', '2027-03', { donationId: 'missing' }),
        occurrence('r1', '2027-04', { donationId: null }),
        occurrence('r1', '2027-05', { donationId: null, status: 'pending' }),
        occurrence('r1', '2027-06', { donationId: null, status: 'declined' }),
        occurrence('r1', '2027-07', { donationId: null, deleted: true }),
      ],
    });
    expect(reconcile(s)).toEqual([
      { kind: 'decline_occurrence', occurrenceId: 'occ_r1_2027-02' },
      { kind: 'decline_occurrence', occurrenceId: 'occ_r1_2027-03' },
      { kind: 'decline_occurrence', occurrenceId: 'occ_r1_2027-04' },
    ]);
  });

  it('4: a live monthly-giving donation with no occurrence gets one, logged', () => {
    const s = snapshot({
      donations: [
        donation('don_occ_r1_2027-03', {
          recurringRuleId: 'r1',
          occurrenceMonth: mk('2027-03'),
          date: d('2027-03-31'),
          amountMinor: 7000,
        }),
        donation('plain'),
        donation('half', { recurringRuleId: 'r1', occurrenceMonth: null }),
        donation('half2', { recurringRuleId: null, occurrenceMonth: mk('2027-03') }),
        donation('removed', {
          recurringRuleId: 'r2',
          occurrenceMonth: mk('2027-03'),
          deleted: true,
        }),
        donation('has', { recurringRuleId: 'r3', occurrenceMonth: mk('2027-03') }),
        donation('revived', { recurringRuleId: 'r4', occurrenceMonth: mk('2027-03') }),
      ],
      occurrences: [
        occurrence('r3', '2027-03', { donationId: 'has' }),
        occurrence('r4', '2027-03', { donationId: 'revived', deleted: true }),
      ],
    });
    expect(reconcile(s)).toEqual([
      {
        kind: 'create_occurrence',
        occurrence: {
          id: 'occ_r1_2027-03',
          ruleId: 'r1',
          month: '2027-03',
          dueDate: '2027-03-31',
          status: 'logged',
          amountMinor: 7000,
          currency: 'SGD',
          donationId: 'don_occ_r1_2027-03',
        },
      },
      {
        kind: 'create_occurrence',
        occurrence: {
          id: 'occ_r4_2027-03',
          ruleId: 'r4',
          month: '2027-03',
          dueDate: '2027-03-05',
          status: 'logged',
          amountMinor: 5000,
          currency: 'SGD',
          donationId: 'revived',
        },
      },
    ]);
  });

  it('5: a receipt of a deleted or missing donation is deleted', () => {
    const s = snapshot({
      donations: [donation('d1'), donation('d2', { deleted: true })],
      receipts: [
        receipt('rc1', 'd1'),
        receipt('rc2', 'd2'),
        receipt('rc3', 'missing'),
        receipt('rc4', 'd2', true),
      ],
    });
    expect(reconcile(s)).toEqual([
      { kind: 'delete_receipt', receiptId: 'rc2' },
      { kind: 'delete_receipt', receiptId: 'rc3' },
    ]);
  });

  it('returns fixes in a stable order whatever order the records arrive in', () => {
    const records = [receipt('rc9', 'x'), receipt('rc1', 'x'), receipt('rc5', 'x')];
    const forward = reconcile(snapshot({ receipts: records }));
    const backward = reconcile(snapshot({ receipts: [...records].reverse() }));
    expect(forward).toEqual(backward);
    expect(forward.map((fix) => (fix.kind === 'delete_receipt' ? fix.receiptId : ''))).toEqual([
      'rc1',
      'rc5',
      'rc9',
    ]);
  });
});

function seeded(seed: number): (below: number) => number {
  let state = seed;
  return (below) => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return Math.floor((state / 4_294_967_296) * below);
  };
}

/** What the data layer does with each fix, so the property test can check nothing is left over. */
function applyFixes(s: ReconcileSnapshot, fixes: readonly ReconcileFix[]): ReconcileSnapshot {
  let next = s;
  for (const fix of fixes) {
    switch (fix.kind) {
      case 'clear_person_donation':
        next = {
          ...next,
          eidPeople: next.eidPeople.map((p) =>
            p.id === fix.personId ? { ...p, donationId: null } : p,
          ),
        };
        break;
      case 'unlink_eid_donation':
        next = {
          ...next,
          donations: next.donations.map((x) =>
            x.id === fix.donationId ? { ...x, eidPersonId: null } : x,
          ),
        };
        break;
      case 'decline_occurrence':
        next = {
          ...next,
          occurrences: next.occurrences.map((o) =>
            o.id === fix.occurrenceId ? { ...o, status: 'declined' } : o,
          ),
        };
        break;
      case 'create_occurrence': {
        const created = fix.occurrence;
        next = {
          ...next,
          occurrences: [
            ...next.occurrences.filter((o) => o.id !== created.id),
            {
              id: created.id,
              deleted: false,
              ruleId: created.ruleId,
              month: created.month,
              status: 'logged',
              donationId: created.donationId,
            },
          ],
        };
        break;
      }
      case 'delete_receipt':
        next = {
          ...next,
          receipts: next.receipts.map((r) =>
            r.id === fix.receiptId ? { ...r, deleted: true } : r,
          ),
        };
        break;
    }
  }
  return next;
}

describe('property: after the fixes are applied, nothing is left to fix', () => {
  it('holds for 300 random, inconsistent snapshots', () => {
    const months = ['2027-01', '2027-02', '2027-03'] as const;
    const statuses = ['pending', 'logged', 'declined', 'skipped'] as const;
    for (let seed = 1; seed <= 300; seed++) {
      const next = seeded(seed);
      const pick = <T>(items: readonly T[]): T | undefined => items[next(items.length)];
      const maybe = <T>(items: readonly T[]): T | null =>
        next(3) === 0 ? null : (pick(items) ?? null);
      const donationIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
      const s: ReconcileSnapshot = {
        donations: donationIds.map((id) =>
          donation(id, {
            deleted: next(4) === 0,
            recurringRuleId: maybe(['r1', 'r2']),
            occurrenceMonth: maybe(months.map((m) => mk(m))),
            eidPersonId: maybe(['p1', 'p2', 'p3']),
          }),
        ),
        eidPeople: ['p1', 'p2', 'p3'].map((id) =>
          person(id, { deleted: next(3) === 0, donationId: maybe([...donationIds, 'ghost']) }),
        ),
        occurrences: ['r1', 'r2'].flatMap((rule) =>
          months.map((m) =>
            occurrence(rule, m, {
              deleted: next(4) === 0,
              status: pick(statuses) ?? 'pending',
              donationId: maybe([...donationIds, 'ghost']),
            }),
          ),
        ),
        receipts: ['rc1', 'rc2', 'rc3', 'rc4'].map((id) =>
          receipt(id, pick([...donationIds, 'ghost']) ?? 'ghost', next(4) === 0),
        ),
      };
      expect(reconcile(applyFixes(s, reconcile(s)))).toEqual([]);
    }
  });
});
