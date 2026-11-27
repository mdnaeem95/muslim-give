import type { CivilDate, MonthKey } from '../dates/civil-date.js';
import type { OccurrenceStatus } from '../codes.js';
import { occurrenceId, type OccurrenceToCreate } from '../recurring.js';

/**
 * Last-writer-wins is per record, so records that point at each other can disagree after a merge
 * (spec 8.6). `reconcile` looks at a snapshot after every pull and says what to change.
 */

export interface DonationFacts {
  readonly id: string;
  readonly deleted: boolean;
  readonly date: CivilDate;
  readonly amountMinor: number;
  readonly currency: string;
  readonly recurringRuleId: string | null;
  readonly occurrenceMonth: MonthKey | null;
  readonly eidPersonId: string | null;
}

export interface EidPersonFacts {
  readonly id: string;
  readonly deleted: boolean;
  readonly donationId: string | null;
}

export interface OccurrenceFacts {
  readonly id: string;
  readonly deleted: boolean;
  readonly ruleId: string;
  readonly month: MonthKey;
  readonly status: OccurrenceStatus;
  readonly donationId: string | null;
}

export interface ReceiptFacts {
  readonly id: string;
  readonly deleted: boolean;
  readonly donationId: string;
}

export interface ReconcileSnapshot {
  readonly donations: readonly DonationFacts[];
  readonly eidPeople: readonly EidPersonFacts[];
  readonly occurrences: readonly OccurrenceFacts[];
  readonly receipts: readonly ReceiptFacts[];
}

export type ReconcileFix =
  /** An Eid person marked given whose donation is gone: show as not given. */
  | { readonly kind: 'clear_person_donation'; readonly personId: string }
  /** A real gift whose Eid person was deleted: keep the gift, drop the Eid link. */
  | { readonly kind: 'unlink_eid_donation'; readonly donationId: string }
  /** A logged occurrence whose donation was deleted on purpose. */
  | { readonly kind: 'decline_occurrence'; readonly occurrenceId: string }
  /** A monthly-giving donation that has no occurrence record. */
  | { readonly kind: 'create_occurrence'; readonly occurrence: OccurrenceToCreate }
  /** A receipt of a deleted donation; its file is queued for deletion too. */
  | { readonly kind: 'delete_receipt'; readonly receiptId: string };

const byKey = <T>(items: readonly T[], key: (item: T) => string): T[] =>
  [...items].sort((a, b) => key(a).localeCompare(key(b)));

/** Fixes for every broken link, in a stable order. Applying them leaves nothing more to fix. */
export function reconcile(snapshot: ReconcileSnapshot): ReconcileFix[] {
  const liveDonations = new Map<string, DonationFacts>();
  for (const donation of snapshot.donations) {
    if (!donation.deleted) liveDonations.set(donation.id, donation);
  }
  const livePeople = new Set<string>();
  for (const person of snapshot.eidPeople) {
    if (!person.deleted) livePeople.add(person.id);
  }
  const liveOccurrences = new Set<string>();
  for (const occurrence of snapshot.occurrences) {
    if (!occurrence.deleted) liveOccurrences.add(occurrence.id);
  }

  const fixes: ReconcileFix[] = [];

  for (const person of byKey(snapshot.eidPeople, (p) => p.id)) {
    const broken =
      !person.deleted && person.donationId !== null && !liveDonations.has(person.donationId);
    if (broken) fixes.push({ kind: 'clear_person_donation', personId: person.id });
  }

  for (const donation of byKey([...liveDonations.values()], (d) => d.id)) {
    if (donation.eidPersonId !== null && !livePeople.has(donation.eidPersonId)) {
      fixes.push({ kind: 'unlink_eid_donation', donationId: donation.id });
    }
  }

  for (const occurrence of byKey(snapshot.occurrences, (o) => o.id)) {
    const orphaned =
      !occurrence.deleted &&
      occurrence.status === 'logged' &&
      (occurrence.donationId === null || !liveDonations.has(occurrence.donationId));
    if (orphaned) fixes.push({ kind: 'decline_occurrence', occurrenceId: occurrence.id });
  }

  for (const donation of byKey([...liveDonations.values()], (d) => d.id)) {
    if (donation.recurringRuleId === null || donation.occurrenceMonth === null) continue;
    const id = occurrenceId(donation.recurringRuleId, donation.occurrenceMonth);
    if (liveOccurrences.has(id)) continue;
    fixes.push({
      kind: 'create_occurrence',
      occurrence: {
        id,
        ruleId: donation.recurringRuleId,
        month: donation.occurrenceMonth,
        dueDate: donation.date,
        status: 'logged',
        amountMinor: donation.amountMinor,
        currency: donation.currency,
        donationId: donation.id,
      },
    });
  }

  for (const receipt of byKey(snapshot.receipts, (r) => r.id)) {
    if (!receipt.deleted && !liveDonations.has(receipt.donationId)) {
      fixes.push({ kind: 'delete_receipt', receiptId: receipt.id });
    }
  }

  return fixes;
}
