/** Spacing on a 4 pt grid, matching the prototype's 6-22 px rhythm. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

/** Spec 6.5: square corners and 1 px rules, as in the prototype. */
export const radius = { none: 0 } as const;
export const ruleWidth = 1;

/** Spec 6.6: minimum touch targets (iOS points, Android dp). */
export const minTouchTarget = { ios: 44, android: 48 } as const;

/** Prototype control heights: inputs and buttons 42, small buttons 32 (raised to the target). */
export const controlHeight = { input: 48, button: 48, smallButton: 44 } as const;
