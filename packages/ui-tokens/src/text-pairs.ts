import type { Palette } from './colors.js';

export interface TextPair {
  readonly foreground: keyof Palette;
  readonly background: keyof Palette;
  readonly use: string;
}

/**
 * Every foreground-on-background pairing the design system uses for body text. A unit test checks
 * each one against WCAG AA (4.5:1) in light and dark (spec 6.5). A new pairing is added here first.
 */
export const TEXT_PAIRS: readonly TextPair[] = [
  { foreground: 'text', background: 'surface', use: 'Body text on cards' },
  { foreground: 'text', background: 'background', use: 'Body text on the screen' },
  { foreground: 'textSecondary', background: 'surface', use: 'Labels' },
  { foreground: 'textSecondary', background: 'background', use: 'Neutral tag text' },
  { foreground: 'textMuted', background: 'surface', use: 'Hints and captions on cards' },
  { foreground: 'textMuted', background: 'background', use: 'Captions on the screen' },
  { foreground: 'textMuted', background: 'noteBackground', use: 'Grey note text' },
  { foreground: 'onPrimary', background: 'primary', use: 'Primary button label' },
  { foreground: 'onPrimary', background: 'primaryDark', use: 'Pressed primary button label' },
  { foreground: 'surface', background: 'text', use: 'Default toast' },
  { foreground: 'onPrimary', background: 'toastWarning', use: 'Nearing-budget toast' },
  { foreground: 'onDanger', background: 'danger', use: 'Over-budget toast and destructive label' },
  { foreground: 'primaryText', background: 'surface', use: 'Green text on cards' },
  { foreground: 'primaryText', background: 'primaryTint', use: 'Done alert text' },
  { foreground: 'textSecondary', background: 'primaryTint', use: 'Note text on green tint' },
  { foreground: 'warningText', background: 'warningTint', use: 'Nearing-budget alert text' },
  { foreground: 'warningText', background: 'surface', use: 'Warning text on cards' },
  { foreground: 'dangerText', background: 'dangerTint', use: 'Over-budget alert text' },
  { foreground: 'dangerText', background: 'surface', use: 'Error text on cards' },
];
