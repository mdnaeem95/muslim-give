import { darkPalette, lightPalette, palettes, type ColorMode, type Palette } from './colors.js';
import { AA_BODY_TEXT, contrastRatio } from './contrast.js';
import { TEXT_PAIRS } from './text-pairs.js';

const modes: ColorMode[] = ['light', 'dark'];

describe('spec 6.5 palette', () => {
  it('uses the prototype hex values in light mode', () => {
    expect(lightPalette.primary).toBe('#00893D');
    expect(lightPalette.primaryDark).toBe('#006E31');
    expect(lightPalette.primaryTint).toBe('#E5F3EB');
    expect(lightPalette.text).toBe('#1E2328');
    expect(lightPalette.textSecondary).toBe('#3C4146');
    expect(lightPalette.textMuted).toBe('#646E78');
    expect(lightPalette.line).toBe('#D7DCE1');
    expect(lightPalette.background).toBe('#F2F4F5');
    expect(lightPalette.danger).toBe('#C8102E');
    expect(lightPalette.warning).toBe('#E6A000');
  });
  it('defines every token in both modes as #RRGGBB', () => {
    const keys = Object.keys(lightPalette).sort();
    expect(Object.keys(darkPalette).sort()).toEqual(keys);
    for (const mode of modes) {
      for (const key of keys) {
        expect(contrastRatio(palettes[mode][key as keyof Palette], '#FFFFFF') === null).toBe(false);
      }
    }
  });
});

describe('spec 6.5 WCAG AA for every text pairing, light and dark', () => {
  for (const mode of modes) {
    for (const pair of TEXT_PAIRS) {
      it(`${mode}: ${pair.foreground} on ${pair.background} (${pair.use})`, () => {
        const palette = palettes[mode];
        const ratio = contrastRatio(palette[pair.foreground], palette[pair.background]);
        expect(ratio !== null && ratio >= AA_BODY_TEXT).toBe(true);
      });
    }
  }
});
