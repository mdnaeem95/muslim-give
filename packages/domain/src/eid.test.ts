import {
  eidGivenMinor,
  eidKpis,
  eidPersonDonationId,
  eidPlannedMinor,
  eidYearOptions,
  packetProgress,
} from './eid.js';

describe('R-EID-01 planned', () => {
  it('adds people, kids packets and elderly packets', () => {
    const planned = eidPlannedMinor(
      [{ amountMinor: 100 }, { amountMinor: 200 }],
      { count: 3, amountEachMinor: 200 },
      { count: 2, amountEachMinor: 500 },
    );
    expect(planned).toBe(1900);
    expect(
      eidPlannedMinor([], { count: 0, amountEachMinor: 200 }, { count: 0, amountEachMinor: 500 }),
    ).toBe(0);
  });
});

describe('R-EID-02 given is read back from the log', () => {
  it('sums only the plans linked donations', () => {
    const donations = [
      { eidPlanId: 'a', amountMinor: 1000 },
      { eidPlanId: 'a', amountMinor: 500 },
      { eidPlanId: 'b', amountMinor: 700 },
      { eidPlanId: null, amountMinor: 400 },
    ];
    expect(eidGivenMinor(donations, 'a')).toBe(1500);
    expect(eidGivenMinor(donations, 'c')).toBe(0);
  });
  it('R-EID-05 gives a ticked person a deterministic donation ID', () => {
    expect(eidPersonDonationId('p1')).toBe('don_eid_p1');
  });
});

describe('R-EID-03 KPI cards', () => {
  it('shows planned, unplanned and progress against the Eid budget', () => {
    expect(eidKpis(2000, 1900, 950)).toEqual({
      level: 'near',
      unplannedMinor: 100,
      overBudgetMinor: 0,
      givenPercent: 50,
    });
  });
  it('shows how far over budget the plan is', () => {
    expect(eidKpis(1000, 1500, 300)).toEqual({
      level: 'over',
      unplannedMinor: 0,
      overBudgetMinor: 500,
      givenPercent: 20,
    });
  });
  it('copes with no budget and nothing planned', () => {
    expect(eidKpis(0, 0, 0)).toEqual({
      level: 'none',
      unplannedMinor: 0,
      overBudgetMinor: 0,
      givenPercent: 0,
    });
  });
});

describe('R-EID-07 packets', () => {
  it('allows giving until the count is reached and undoing while any were given', () => {
    expect(packetProgress(3, 0)).toEqual({
      given: 0,
      count: 3,
      canGiveOne: true,
      canUndoOne: false,
    });
    expect(packetProgress(3, 1)).toEqual({
      given: 1,
      count: 3,
      canGiveOne: true,
      canUndoOne: true,
    });
    expect(packetProgress(3, 3)).toEqual({
      given: 3,
      count: 3,
      canGiveOne: false,
      canUndoOne: true,
    });
  });
});

describe('R-EID-09 year list', () => {
  it('offers last, this and next year plus any year with a plan', () => {
    expect(eidYearOptions(2027, [])).toEqual([2026, 2027, 2028]);
    expect(eidYearOptions(2027, [2030, 2025, 2027])).toEqual([2025, 2026, 2027, 2028, 2030]);
  });
});
