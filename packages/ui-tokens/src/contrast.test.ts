import { AA_BODY_TEXT, contrastRatio, relativeLuminance } from './contrast.js';

describe('WCAG contrast maths', () => {
  it('gives the extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
  });
  it('is symmetric', () => {
    expect(contrastRatio('#1E2328', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#1E2328'));
  });
  it('matches a published reference value', () => {
    // #767676 on white is the classic 4.54:1 AA threshold example.
    const ratio = contrastRatio('#767676', '#FFFFFF') ?? 0;
    expect(Math.round(ratio * 100)).toBe(454);
  });
  it('rejects anything that is not #RRGGBB', () => {
    expect(relativeLuminance('red')).toBe(null);
    expect(relativeLuminance('#FFF')).toBe(null);
    expect(contrastRatio('red', '#FFFFFF')).toBe(null);
    expect(contrastRatio('#FFFFFF', 'nope')).toBe(null);
  });
  it('uses 4.5 for body text', () => {
    expect(AA_BODY_TEXT).toBe(4.5);
  });
});
