import { palettes, TEXT_PAIRS } from '@muslim-give/ui-tokens';
import { ALERT_STYLES, type AlertLevel } from './alert';

const levels: readonly AlertLevel[] = ['near', 'over', 'done'];

describe('ALERT_STYLES (spec 6.5)', () => {
  it('give each level its own icon on each platform, so colour is never the only signal', () => {
    expect(new Set(levels.map((level) => ALERT_STYLES[level].icon.ios)).size).toBe(3);
    expect(new Set(levels.map((level) => ALERT_STYLES[level].icon.android)).size).toBe(3);
  });

  it('give each level its own spoken prefix', () => {
    expect(new Set(levels.map((level) => ALERT_STYLES[level].prefixKey)).size).toBe(3);
  });

  it('use only colour pairs that the contrast test checks', () => {
    for (const level of levels) {
      const { text, background } = ALERT_STYLES[level];
      const checked = TEXT_PAIRS.some(
        (pair) => pair.foreground === text && pair.background === background,
      );
      expect(checked).toBe(true);
    }
  });

  it('name colours that exist in both palettes', () => {
    for (const level of levels) {
      const style = ALERT_STYLES[level];
      for (const key of [style.background, style.accent, style.text]) {
        expect(typeof palettes.light[key]).toBe('string');
        expect(typeof palettes.dark[key]).toBe('string');
      }
    }
  });
});
