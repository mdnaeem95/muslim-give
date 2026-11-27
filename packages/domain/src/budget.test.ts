import {
  DEFAULT_SHARE_STEPS,
  MAX_SHARE_STEPS,
  budgetLevel,
  budgetStatus,
  isBudgetPaused,
  monthlyGivingShareOfBudget,
  suggestedBudgetMinor,
} from './budget.js';

describe('R-BUD-02 levels', () => {
  it('classifies spend against the budget', () => {
    expect(budgetLevel(0, 0)).toBe('none');
    expect(budgetLevel(10, -1)).toBe('none');
    expect(budgetLevel(50, 100)).toBe('ok');
    expect(budgetLevel(79, 100)).toBe('ok');
    expect(budgetLevel(80, 100)).toBe('near');
    expect(budgetLevel(99, 100)).toBe('near');
    expect(budgetLevel(100, 100)).toBe('done');
    expect(budgetLevel(101, 100)).toBe('over');
  });
});

describe('R-BUD-03 meter data', () => {
  it('reports a near budget', () => {
    expect(budgetStatus(85, 100)).toEqual({
      level: 'near',
      usedPercent: 85,
      leftMinor: 15,
      excessMinor: 0,
      meterGreenPercent: 85,
      meterRedPercent: 0,
    });
  });
  it('splits the bar green and red when over budget', () => {
    expect(budgetStatus(200, 100)).toEqual({
      level: 'over',
      usedPercent: 200,
      leftMinor: 0,
      excessMinor: 100,
      meterGreenPercent: 50,
      meterRedPercent: 50,
    });
  });
  it('fills the bar when the budget is reached', () => {
    const status = budgetStatus(100, 100);
    expect(status.level).toBe('done');
    expect(status.meterGreenPercent).toBe(100);
    expect(status.meterRedPercent).toBe(0);
  });
  it('rounds the displayed percentage', () => {
    expect(budgetStatus(1, 3).usedPercent).toBe(33);
  });
  it('is empty without a budget', () => {
    expect(budgetStatus(500, 0)).toEqual({
      level: 'none',
      usedPercent: 0,
      leftMinor: 0,
      excessMinor: 0,
      meterGreenPercent: 0,
      meterRedPercent: 0,
    });
  });
});

describe('R-BUD-04 monthly giving share', () => {
  it('shows the share of the budget, or nothing without a budget', () => {
    expect(monthlyGivingShareOfBudget(500, 2000)).toBe(25);
    expect(monthlyGivingShareOfBudget(500, 0)).toBe(null);
  });
});

describe('R-BUD-05 how much should I give', () => {
  it('uses 2.5% by default and a 0-20% slider in half-percent steps', () => {
    expect(DEFAULT_SHARE_STEPS).toBe(5);
    expect(MAX_SHARE_STEPS).toBe(40);
  });
  it('rounds half up to a whole major unit of the currency', () => {
    expect(suggestedBudgetMinor(450000, 5, 'SGD')).toEqual({ ok: true, value: 11300 });
    expect(suggestedBudgetMinor(450000, 40, 'SGD')).toEqual({ ok: true, value: 90000 });
    expect(suggestedBudgetMinor(450000, 0, 'SGD')).toEqual({ ok: true, value: 0 });
    expect(suggestedBudgetMinor(300000, 5, 'JPY')).toEqual({ ok: true, value: 7500 });
    expect(suggestedBudgetMinor(4500000, 5, 'KWD')).toEqual({ ok: true, value: 113000 });
  });
  it('rejects bad income or share', () => {
    const income = { ok: false, error: { code: 'budget.invalid_income' } };
    const share = { ok: false, error: { code: 'budget.invalid_share' } };
    expect(suggestedBudgetMinor(-1, 5, 'SGD')).toEqual(income);
    expect(suggestedBudgetMinor(1.5, 5, 'SGD')).toEqual(income);
    expect(suggestedBudgetMinor(1000, 41, 'SGD')).toEqual(share);
    expect(suggestedBudgetMinor(1000, 2.5, 'SGD')).toEqual(share);
    expect(suggestedBudgetMinor(1000, -1, 'SGD')).toEqual(share);
  });
});

describe('R-BUD-06 currency change pauses the budget', () => {
  it('pauses a budget held in another currency', () => {
    expect(isBudgetPaused('SGD', 'SGD')).toBe(false);
    expect(isBudgetPaused('MYR', 'SGD')).toBe(true);
  });
});
