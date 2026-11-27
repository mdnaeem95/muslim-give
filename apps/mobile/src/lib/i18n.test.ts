import { createTranslator } from './i18n.js';

const t = createTranslator({
  'greeting.plain': 'Assalamualaikum',
  'greeting.named': 'Assalamualaikum, {name}',
  'count.logged': 'You have logged {count} gifts, {count} in total, for {who}',
});

describe('createTranslator (spec 6.7)', () => {
  it('returns the catalog text', () => {
    expect(t('greeting.plain')).toBe('Assalamualaikum');
  });
  it('fills placeholders, numbers included, every time they appear', () => {
    expect(t('greeting.named', { name: 'Isa' })).toBe('Assalamualaikum, Isa');
    expect(t('count.logged', { count: 3, who: 'Mak' })).toBe(
      'You have logged 3 gifts, 3 in total, for Mak',
    );
  });
  it('leaves a placeholder visible when no value is given', () => {
    expect(t('greeting.named', {})).toBe('Assalamualaikum, {name}');
    expect(t('greeting.named')).toBe('Assalamualaikum, {name}');
  });
  it('shows the key for a key missing from the catalog', () => {
    const loose = createTranslator<Record<string, string>>({});
    expect(loose('nope.missing')).toBe('nope.missing');
  });
});
