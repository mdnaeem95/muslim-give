import { controlHeight, minTouchTarget, radius, ruleWidth, space } from './layout.js';
import { meterColors, type MeterLevel } from './meter.js';
import { fontFamily, fontSize, fontWeight, lineHeightRatio, MAX_FONT_SCALE } from './typography.js';

describe('spec 6.5 type scale', () => {
  it('uses the 26 / 20 / 17 / 15 / 13 / 12 scale and Noto Sans weights', () => {
    expect([
      fontSize.title,
      fontSize.heading,
      fontSize.subheading,
      fontSize.body,
      fontSize.caption,
      fontSize.small,
    ]).toEqual([26, 20, 17, 15, 13, 12]);
    expect(fontSize.display).toBe(40);
    expect(Object.values(fontWeight)).toEqual(['400', '500', '600', '700']);
    expect(Object.values(fontFamily)).toEqual([
      'NotoSans-Regular',
      'NotoSans-Medium',
      'NotoSans-SemiBold',
      'NotoSans-Bold',
    ]);
    expect(lineHeightRatio).toBe(1.45);
    expect(MAX_FONT_SCALE).toBe(2);
  });
});

describe('spec 6.5 and 6.6 layout', () => {
  it('has square corners and 1 px rules', () => {
    expect(radius.none).toBe(0);
    expect(ruleWidth).toBe(1);
  });
  it('keeps spacing on a 4 pt grid', () => {
    for (const value of Object.values(space)) expect(value % 4).toBe(0);
  });
  it('makes every control meet the platform touch target', () => {
    expect(minTouchTarget).toEqual({ ios: 44, android: 48 });
    expect(controlHeight.input >= minTouchTarget.android).toBe(true);
    expect(controlHeight.button >= minTouchTarget.android).toBe(true);
    expect(controlHeight.smallButton >= minTouchTarget.ios).toBe(true);
  });
});

describe('R-BUD-03 meter colours', () => {
  it('maps each level to green, amber or red and never relies on colour alone', () => {
    expect(meterColors('ok').fill).toBe('primary');
    expect(meterColors('done').fill).toBe('primary');
    expect(meterColors('near').fill).toBe('warning');
    expect(meterColors('over').fill).toBe('danger');
    expect(meterColors('none').fill).toBe('line');
    expect(meterColors('near').icon).toBe('warning');
    expect(meterColors('over').icon).toBe('alert');
    expect(meterColors('done').icon).toBe('check');
    const levels: MeterLevel[] = ['ok', 'near', 'done', 'over', 'none'];
    expect(levels.map((l) => meterColors(l).icon)).toEqual([
      'none',
      'warning',
      'check',
      'alert',
      'none',
    ]);
  });
});
