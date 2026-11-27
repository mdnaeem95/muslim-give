import { budgetLevel, type BudgetLevel } from './budget.js';

export interface EidPersonAmount {
  readonly amountMinor: number;
}
export interface EidPacketGroup {
  readonly count: number;
  readonly amountEachMinor: number;
}

/** R-EID-05: the donation behind a ticked person has a deterministic ID (spec 7.3). */
export const eidPersonDonationId = (personId: string): string => `don_eid_${personId}`;

/** R-EID-01: planned = people's amounts + kids packets x amount + elderly packets x amount. */
export function eidPlannedMinor(
  people: readonly EidPersonAmount[],
  kids: EidPacketGroup,
  elderly: EidPacketGroup,
): number {
  const peopleTotal = people.reduce((total, person) => total + person.amountMinor, 0);
  return peopleTotal + kids.count * kids.amountEachMinor + elderly.count * elderly.amountEachMinor;
}

export interface EidLinkedDonation {
  readonly eidPlanId: string | null;
  readonly amountMinor: number;
}

/**
 * R-EID-02: given = the plan's live linked donations (people gifts and packet gifts), always read
 * back from the log so the planner and the log cannot disagree.
 */
export function eidGivenMinor(donations: readonly EidLinkedDonation[], planId: string): number {
  return donations
    .filter((donation) => donation.eidPlanId === planId)
    .reduce((total, donation) => total + donation.amountMinor, 0);
}

export interface EidKpis {
  /** Planned against the Eid budget, using the R-BUD-02 levels (R-EID-03). */
  readonly level: BudgetLevel;
  readonly unplannedMinor: number;
  readonly overBudgetMinor: number;
  /** Given as a share of planned, rounded; 0 when nothing is planned. */
  readonly givenPercent: number;
}

export function eidKpis(budgetMinor: number, plannedMinor: number, givenMinor: number): EidKpis {
  return {
    level: budgetLevel(plannedMinor, budgetMinor),
    unplannedMinor: Math.max(0, budgetMinor - plannedMinor),
    overBudgetMinor: Math.max(0, plannedMinor - budgetMinor),
    givenPercent: plannedMinor > 0 ? Math.round((givenMinor * 100) / plannedMinor) : 0,
  };
}

export interface PacketProgress {
  /** Shown as "{given} / {count}". */
  readonly given: number;
  readonly count: number;
  /** R-EID-07: "+ Gave one" works until given equals the packet count. */
  readonly canGiveOne: boolean;
  readonly canUndoOne: boolean;
}

export function packetProgress(count: number, given: number): PacketProgress {
  return { given, count, canGiveOne: given < count, canUndoOne: given > 0 };
}

/** R-EID-09: last year, this year and next year, plus any year that already has a plan. */
export function eidYearOptions(thisYear: number, yearsWithPlans: readonly number[]): number[] {
  return [...new Set([thisYear - 1, thisYear, thisYear + 1, ...yearsWithPlans])].sort(
    (a, b) => a - b,
  );
}
