import { chartModel, type ChartRow } from './chart';

const row = (label: string, value: number): ChartRow => ({
  label,
  value,
  valueLabel: `S$${String(value)}`,
});

describe('chartModel', () => {
  it('sizes each row against the largest and gives its share of the total', () => {
    const model = chartModel([row('Mosque', 320), row('Zakat', 160), row('Fidyah', 320)]);
    expect(model.total).toBe(800);
    expect(model.rows.map((r) => r.fraction)).toEqual([1, 0.5, 1]);
    expect(model.rows.map((r) => r.sharePercent)).toEqual([40, 20, 40]);
  });

  it('rounds shares to whole percentages', () => {
    const model = chartModel([row('a', 1), row('b', 2)]);
    expect(model.rows.map((r) => r.sharePercent)).toEqual([33, 67]);
  });

  it('draws nothing, and divides by nothing, when every value is zero', () => {
    const model = chartModel([row('a', 0), row('b', 0)]);
    expect(model.total).toBe(0);
    expect(model.rows.map((r) => r.fraction)).toEqual([0, 0]);
    expect(model.rows.map((r) => r.sharePercent)).toEqual([0, 0]);
  });

  it('handles an empty chart', () => {
    const model = chartModel([]);
    expect(model.total).toBe(0);
    expect(model.rows).toHaveLength(0);
  });

  it('treats negative and invalid values as zero', () => {
    const model = chartModel([row('a', -50), row('b', Number.NaN), row('c', 10)]);
    expect(model.total).toBe(10);
    expect(model.rows.map((r) => r.fraction)).toEqual([0, 0, 1]);
  });

  it('keeps the original labels and values on each row', () => {
    const model = chartModel([
      { ...row('Mosque', 320), shortLabel: 'M', spokenValue: '320 dollars' },
    ]);
    expect(model.rows[0]?.label).toBe('Mosque');
    expect(model.rows[0]?.shortLabel).toBe('M');
    expect(model.rows[0]?.spokenValue).toBe('320 dollars');
  });
});
