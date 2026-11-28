import { palettes, TEXT_PAIRS, type MeterLevel } from '@muslim-give/ui-tokens';
import { clampPercent, METER_ICONS, meterModel } from './meter';

const levels: readonly MeterLevel[] = ['none', 'ok', 'near', 'done', 'over'];

describe('clampPercent', () => {
  it('keeps a percentage inside 0 to 100', () => {
    expect(clampPercent(42.5)).toBe(42.5);
    expect(clampPercent(-3)).toBe(0);
    expect(clampPercent(140)).toBe(100);
  });
  it('treats anything that is not a number as 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('meterModel (R-BUD-03)', () => {
  it('shows green only for ok and done', () => {
    const ok = meterModel('ok', 50, 50, 0);
    expect(ok.greenWidth).toBe(50);
    expect(ok.redWidth).toBe(0);
    expect(ok.colors.fill).toBe('primary');
    expect(meterModel('done', 100, 100, 0).colors.fill).toBe('primary');
  });

  it('uses amber for near', () => {
    expect(meterModel('near', 85, 85, 0).colors.fill).toBe('warning');
  });

  it('splits an over-budget bar into the budget share and the excess', () => {
    const over = meterModel('over', 125, 80, 20);
    expect(over.greenWidth).toBe(80);
    expect(over.redWidth).toBe(20);
    expect(over.colors.fill).toBe('danger');
    expect(over.percentUsed).toBe(125);
  });

  it('never lets the two segments add up to more than the bar', () => {
    const model = meterModel('over', 200, 70, 50);
    expect(model.greenWidth + model.redWidth).toBe(100);
  });

  it('shows no percentage when there is no budget', () => {
    expect(meterModel('none', 0, 0, 0).percentUsed).toBeNull();
  });

  it('rounds the percentage and survives a bad number', () => {
    expect(meterModel('ok', 49.6, 49.6, 0).percentUsed).toBe(50);
    expect(meterModel('ok', Number.NaN, 0, 0).percentUsed).toBe(0);
    expect(meterModel('ok', -5, 0, 0).percentUsed).toBe(0);
  });

  it('gives each level its own spoken label', () => {
    expect(new Set(levels.map((level) => meterModel(level, 0, 0, 0).labelKey)).size).toBe(5);
  });

  it('pairs every coloured level with an icon, so colour is never the only signal', () => {
    for (const level of ['near', 'done', 'over'] as const) {
      const icon = meterModel(level, 0, 0, 0).colors.icon;
      expect(icon).not.toBe('none');
    }
    expect(new Set(Object.values(METER_ICONS).map((icon) => icon.ios)).size).toBe(3);
  });

  it('uses text colours that the contrast test checks, in both palettes', () => {
    for (const level of levels) {
      const { text } = meterModel(level, 0, 0, 0).colors;
      expect(typeof palettes.light[text]).toBe('string');
      expect(typeof palettes.dark[text]).toBe('string');
    }
    for (const level of ['near', 'over', 'done'] as const) {
      const { text, tint } = meterModel(level, 0, 0, 0).colors;
      const checked = TEXT_PAIRS.some(
        (pair) => pair.foreground === text && pair.background === tint,
      );
      expect(checked).toBe(true);
    }
  });
});
