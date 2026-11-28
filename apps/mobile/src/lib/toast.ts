import type { Palette } from '@muslim-give/ui-tokens';

export type ToastTone = 'default' | 'near' | 'over';

/** Prototype toasts: ink for normal, amber for nearing budget, red for over budget. */
export const TOAST_STYLES = {
  default: { background: 'text', text: 'surface' },
  near: { background: 'toastWarning', text: 'onPrimary' },
  over: { background: 'danger', text: 'onDanger' },
} as const satisfies Readonly<
  Record<ToastTone, { readonly background: keyof Palette; readonly text: keyof Palette }>
>;

const MIN_MS = 4000;
const MAX_MS = 10000;
const FREE_CHARACTERS = 40;
const MS_PER_EXTRA_CHARACTER = 60;

/**
 * How long a toast stays: four seconds, plus time to read anything longer than a short line, up
 * to ten seconds. Messages such as "over this month's budget" carry real information, so a long
 * one must not vanish before it can be read.
 */
export function toastDurationMs(message: string): number {
  const extra = Math.max(0, message.length - FREE_CHARACTERS) * MS_PER_EXTRA_CHARACTER;
  return Math.min(MAX_MS, MIN_MS + extra);
}
