/** One bar or column: what it is called, its size, and how its value reads aloud. */
export interface ChartRow {
  readonly label: string;
  /** A short label for the axis, such as "J" for January. Defaults to `label`. */
  readonly shortLabel?: string | undefined;
  /** Non-negative; negative or invalid values are drawn as zero. */
  readonly value: number;
  /** The value as shown, e.g. "S$320". */
  readonly valueLabel: string;
  /** The value as said, e.g. "320 Singapore dollars". Defaults to `valueLabel`. */
  readonly spokenValue?: string | undefined;
}

export interface ChartRowModel extends ChartRow {
  /** Size relative to the largest row, 0 to 1. */
  readonly fraction: number;
  /** Share of the total, rounded, 0 to 100. */
  readonly sharePercent: number;
}

export interface ChartModel {
  readonly rows: readonly ChartRowModel[];
  readonly total: number;
}

const usable = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Sizes and shares for a chart, from its rows. Pure, so it is tested without drawing anything. */
export function chartModel(rows: readonly ChartRow[]): ChartModel {
  const sized = rows.map((row) => ({ row, value: usable(row.value) }));
  const max = Math.max(0, ...sized.map((item) => item.value));
  const total = sized.reduce((sum, item) => sum + item.value, 0);
  return {
    total,
    rows: sized.map(({ row, value }) => ({
      ...row,
      fraction: max > 0 ? value / max : 0,
      sharePercent: total > 0 ? Math.round((value * 100) / total) : 0,
    })),
  };
}
