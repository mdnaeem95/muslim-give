import { palettes, TEXT_PAIRS } from '@muslim-give/ui-tokens';
import { TOAST_STYLES, toastDurationMs, type ToastTone } from './toast';

describe('toastDurationMs', () => {
  it('shows a short message for four seconds', () => {
    expect(toastDurationMs('')).toBe(4000);
    expect(toastDurationMs('S$10 recorded. May it be accepted.')).toBe(4000);
    expect(toastDurationMs('x'.repeat(40))).toBe(4000);
  });

  it('adds time for each character past a short line', () => {
    expect(toastDurationMs('x'.repeat(100))).toBe(7600);
  });

  it('stops at ten seconds', () => {
    expect(toastDurationMs('x'.repeat(500))).toBe(10000);
  });
});

describe('TOAST_STYLES (spec 6.5)', () => {
  const tones: readonly ToastTone[] = ['default', 'near', 'over'];

  it('use only text and background pairs the contrast test checks', () => {
    for (const tone of tones) {
      const { text, background } = TOAST_STYLES[tone];
      const checked = TEXT_PAIRS.some(
        (pair) => pair.foreground === text && pair.background === background,
      );
      expect(checked).toBe(true);
    }
  });

  it('name colours that exist in both palettes', () => {
    for (const tone of tones) {
      const { text, background } = TOAST_STYLES[tone];
      for (const key of [text, background]) {
        expect(typeof palettes.light[key]).toBe('string');
        expect(typeof palettes.dark[key]).toBe('string');
      }
    }
  });
});
