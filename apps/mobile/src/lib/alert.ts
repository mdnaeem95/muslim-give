import type { Palette } from '@muslim-give/ui-tokens';

export type AlertLevel = 'near' | 'over' | 'done';

export interface AlertStyle {
  readonly background: keyof Palette;
  readonly accent: keyof Palette;
  readonly text: keyof Palette;
  /** Colour is never the only signal (spec 6.5): every level has its own icon and spoken prefix. */
  readonly icon: { readonly ios: string; readonly android: string };
  readonly prefixKey: 'alert.near.prefix' | 'alert.over.prefix' | 'alert.done.prefix';
}

export const ALERT_STYLES: Readonly<Record<AlertLevel, AlertStyle>> = {
  near: {
    background: 'warningTint',
    accent: 'warning',
    text: 'warningText',
    icon: { ios: 'exclamationmark.triangle', android: 'warning' },
    prefixKey: 'alert.near.prefix',
  },
  over: {
    background: 'dangerTint',
    accent: 'danger',
    text: 'dangerText',
    icon: { ios: 'exclamationmark.octagon', android: 'error' },
    prefixKey: 'alert.over.prefix',
  },
  done: {
    background: 'primaryTint',
    accent: 'primary',
    text: 'primaryText',
    icon: { ios: 'checkmark.circle', android: 'check_circle' },
    prefixKey: 'alert.done.prefix',
  },
};
