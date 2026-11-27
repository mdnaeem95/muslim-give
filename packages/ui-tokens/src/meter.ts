import type { Palette } from './colors.js';

/** Budget meter and alert levels (R-BUD-02/03), mirrored here so UI code needs no domain import. */
export type MeterLevel = 'none' | 'ok' | 'near' | 'done' | 'over';

export interface MeterColors {
  readonly fill: keyof Palette;
  readonly tint: keyof Palette;
  readonly text: keyof Palette;
  /** Colour is never the only signal (spec 6.5): each level also has an icon name. */
  readonly icon: 'none' | 'check' | 'warning' | 'alert';
}

/** R-BUD-03: ok and done are green, near is amber, over is red. */
export function meterColors(level: MeterLevel): MeterColors {
  switch (level) {
    case 'near':
      return { fill: 'warning', tint: 'warningTint', text: 'warningText', icon: 'warning' };
    case 'over':
      return { fill: 'danger', tint: 'dangerTint', text: 'dangerText', icon: 'alert' };
    case 'done':
      return { fill: 'primary', tint: 'primaryTint', text: 'primaryText', icon: 'check' };
    case 'ok':
      return { fill: 'primary', tint: 'primaryTint', text: 'primaryText', icon: 'none' };
    case 'none':
      return { fill: 'line', tint: 'noteBackground', text: 'textMuted', icon: 'none' };
  }
}
