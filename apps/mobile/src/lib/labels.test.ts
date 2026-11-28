import { alertLabel, joinLabel } from './labels';

describe('joinLabel', () => {
  it('joins the parts with commas', () => {
    expect(joinLabel(['Masjid Sultan', 'Zakat', '50 Singapore dollars'])).toBe(
      'Masjid Sultan, Zakat, 50 Singapore dollars',
    );
  });

  it('skips missing and empty parts', () => {
    expect(joinLabel(['Masjid Sultan', undefined, '', null, '50 Singapore dollars'])).toBe(
      'Masjid Sultan, 50 Singapore dollars',
    );
  });

  it('is empty when there is nothing to say', () => {
    expect(joinLabel([undefined, null, ''])).toBe('');
    expect(joinLabel([])).toBe('');
  });
});

describe('alertLabel', () => {
  it('puts the level before the message', () => {
    expect(alertLabel('Over budget', 'Your plan is 25 over.')).toBe(
      'Over budget. Your plan is 25 over.',
    );
  });
});
