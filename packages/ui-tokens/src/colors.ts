/**
 * Spec 6.5: colour tokens come straight from the prototype CSS and live here and nowhere else.
 * Names are semantic so light and dark share one vocabulary. Prototype names are in comments.
 */
export interface Palette {
  /** --bg: screen background. */
  readonly background: string;
  /** --white: cards and inputs. */
  readonly surface: string;
  /** --ink: body text. */
  readonly text: string;
  /** --anth: labels and secondary text. */
  readonly textSecondary: string;
  /** --grey: hints and captions. */
  readonly textMuted: string;
  /** --line: 1 px rules and borders. */
  readonly line: string;
  /** --green: fills, buttons, focus. Text on it uses `onPrimary`. */
  readonly primary: string;
  /** --green-dk: pressed buttons. */
  readonly primaryDark: string;
  /** --green-lt: tinted backgrounds. */
  readonly primaryTint: string;
  /** Green used as text. The prototype's #00893D on its own tint is 3.95:1, below AA. */
  readonly primaryText: string;
  readonly onPrimary: string;
  /** --warn: fills and borders for over-budget and destructive actions. */
  readonly danger: string;
  readonly onDanger: string;
  /** --warn-lt. */
  readonly dangerTint: string;
  /** Text on `dangerTint` and on `surface`. */
  readonly dangerText: string;
  /** --amber: fills and borders for nearing budget. */
  readonly warning: string;
  /** --amber-lt. */
  readonly warningTint: string;
  /** Text on `warningTint` and on `surface`. */
  readonly warningText: string;
  /** The prototype's grey note background (#EEF0F2). */
  readonly noteBackground: string;
  /** Toast background for "nearing budget" (.toast.near). */
  readonly toastWarning: string;
}

export const lightPalette: Palette = {
  background: '#F2F4F5',
  surface: '#FFFFFF',
  text: '#1E2328',
  textSecondary: '#3C4146',
  textMuted: '#646E78',
  line: '#D7DCE1',
  primary: '#00893D',
  primaryDark: '#006E31',
  primaryTint: '#E5F3EB',
  primaryText: '#006E31',
  onPrimary: '#FFFFFF',
  danger: '#C8102E',
  onDanger: '#FFFFFF',
  dangerTint: '#FBE7EA',
  dangerText: '#7A0A1C',
  warning: '#E6A000',
  warningTint: '#FDF4DC',
  warningText: '#6B4A00',
  noteBackground: '#EEF0F2',
  toastWarning: '#8A6000',
};

/** Defined now so screens never hard-code colours; launch ships light only (spec 6.5, 22). */
export const darkPalette: Palette = {
  background: '#14181C',
  surface: '#1E2328',
  text: '#F2F4F5',
  textSecondary: '#C9D0D6',
  textMuted: '#A9B2BB',
  line: '#3C4146',
  primary: '#00893D',
  primaryDark: '#007A36',
  primaryTint: '#16301F',
  primaryText: '#6FD99D',
  onPrimary: '#FFFFFF',
  danger: '#C8102E',
  onDanger: '#FFFFFF',
  dangerTint: '#3F1520',
  dangerText: '#FFB3BE',
  warning: '#E6A000',
  warningTint: '#3A2E0F',
  warningText: '#F6D48A',
  noteBackground: '#262C32',
  toastWarning: '#8A6000',
};

export type ColorMode = 'light' | 'dark';

export const palettes: Readonly<Record<ColorMode, Palette>> = {
  light: lightPalette,
  dark: darkPalette,
};
