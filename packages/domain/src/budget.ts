import { err, ok, type AppError, type Result } from './result.js';
import { exponentOf } from './money/money.js';

export type BudgetLevel = 'none' | 'ok' | 'near' | 'done' | 'over';

/**
 * Rule R-BUD-02: level for spend `s` against budget `b` (minor units): over if s > b, done if
 * s = b, near if s is at least 80% of b, ok otherwise, none if b = 0. Integer arithmetic only.
 */
export function budgetLevel(spentMinor: number, budgetMinor: number): BudgetLevel {
  if (budgetMinor <= 0) return 'none';
  if (spentMinor > budgetMinor) return 'over';
  if (spentMinor === budgetMinor) return 'done';
  return spentMinor * 5 >= budgetMinor * 4 ? 'near' : 'ok';
}

export interface BudgetStatus {
  readonly level: BudgetLevel;
  /** Rounded for display, e.g. "You've used 85%". */
  readonly usedPercent: number;
  readonly leftMinor: number;
  readonly excessMinor: number;
  /** R-BUD-03: meter segments; over shows the budget share green and the excess red. */
  readonly meterGreenPercent: number;
  readonly meterRedPercent: number;
}

/** Everything the budget meter and its messages (R-BUD-03) need, as data. */
export function budgetStatus(spentMinor: number, budgetMinor: number): BudgetStatus {
  const level = budgetLevel(spentMinor, budgetMinor);
  if (level === 'none') {
    return {
      level,
      usedPercent: 0,
      leftMinor: 0,
      excessMinor: 0,
      meterGreenPercent: 0,
      meterRedPercent: 0,
    };
  }
  const green =
    level === 'over' ? (budgetMinor * 100) / spentMinor : (spentMinor * 100) / budgetMinor;
  return {
    level,
    usedPercent: Math.round((spentMinor * 100) / budgetMinor),
    leftMinor: Math.max(0, budgetMinor - spentMinor),
    excessMinor: Math.max(0, spentMinor - budgetMinor),
    meterGreenPercent: green,
    meterRedPercent: level === 'over' ? 100 - green : 0,
  };
}

/** R-BUD-04: monthly giving as a percentage of the budget, or null when there is no budget. */
export function monthlyGivingShareOfBudget(
  monthlyGivingMinor: number,
  budgetMinor: number,
): number | null {
  return budgetMinor > 0 ? Math.round((monthlyGivingMinor * 100) / budgetMinor) : null;
}

/** R-BUD-06: a budget in another currency than the home currency is paused (not counted). */
export function isBudgetPaused(budgetCurrency: string, homeCurrency: string): boolean {
  return budgetCurrency !== homeCurrency;
}

export interface BudgetCalcError extends AppError {
  readonly code: 'budget.invalid_income' | 'budget.invalid_share';
}

/** R-BUD-05: the slider runs 0-20% in 0.5% steps, so 0-40 half-percent steps. */
export const MAX_SHARE_STEPS = 40;
/** R-BUD-05: default 2.5%. */
export const DEFAULT_SHARE_STEPS = 5;

/**
 * R-BUD-05: nett monthly income times the chosen share, rounded to the nearest whole major unit
 * (half up). The income is used only inside this call: it is never persisted or logged.
 */
export function suggestedBudgetMinor(
  incomeMinor: number,
  shareSteps: number,
  currency: string,
): Result<number, BudgetCalcError> {
  if (!Number.isSafeInteger(incomeMinor) || incomeMinor < 0) {
    return err({ code: 'budget.invalid_income' });
  }
  if (!Number.isInteger(shareSteps) || shareSteps < 0 || shareSteps > MAX_SHARE_STEPS) {
    return err({ code: 'budget.invalid_share' });
  }
  const majorUnit = 10 ** exponentOf(currency);
  const numerator = incomeMinor * shareSteps;
  const denominator = 200 * majorUnit;
  return ok(Math.floor((2 * numerator + denominator) / (2 * denominator)) * majorUnit);
}
