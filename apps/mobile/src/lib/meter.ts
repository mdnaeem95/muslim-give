import { meterColors, type MeterColors, type MeterLevel } from '@muslim-give/ui-tokens';
import { ALERT_STYLES } from './alert';

/** Icon names for the meter levels that have one; they reuse the alert icons so the two agree. */
export const METER_ICONS = {
  check: ALERT_STYLES.done.icon,
  warning: ALERT_STYLES.near.icon,
  alert: ALERT_STYLES.over.icon,
} as const;

const LABEL_KEYS = {
  ok: 'meter.ok.label',
  near: 'meter.near.label',
  done: 'meter.done.label',
  over: 'meter.over.label',
  none: 'meter.none.label',
} as const satisfies Readonly<Record<MeterLevel, string>>;

export interface MeterModel {
  readonly colors: MeterColors;
  readonly labelKey: (typeof LABEL_KEYS)[MeterLevel];
  /** Bar segment widths, 0 to 100 each and never more than 100 together. */
  readonly greenWidth: number;
  readonly redWidth: number;
  /** The percentage shown in words; can exceed 100 when over budget. Null when there is no budget. */
  readonly percentUsed: number | null;
}

/** A percentage kept inside 0 to 100; anything that is not a number counts as 0. */
export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

/**
 * Everything the meter draws and says, from a budget status (R-BUD-03). The percentage and icon
 * are always provided, so colour is never the only signal (spec 6.5).
 */
export function meterModel(
  level: MeterLevel,
  usedPercent: number,
  greenPercent: number,
  redPercent: number,
): MeterModel {
  const greenWidth = clampPercent(greenPercent);
  const redWidth = Math.min(clampPercent(redPercent), 100 - greenWidth);
  return {
    colors: meterColors(level),
    labelKey: LABEL_KEYS[level],
    greenWidth,
    redWidth,
    percentUsed:
      level === 'none'
        ? null
        : Math.round(Math.max(0, Number.isFinite(usedPercent) ? usedPercent : 0)),
  };
}
