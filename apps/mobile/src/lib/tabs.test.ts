import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TABS } from './tabs';

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8'),
) as Record<string, string>;

describe('TABS (spec 6.4)', () => {
  it('are the five tabs in the specified order', () => {
    expect(TABS.map((tab) => tab.name)).toEqual(['dashboard', 'log', 'eid', 'budget', 'profile']);
  });

  it('have copy for the label and the accessibility label of every tab', () => {
    for (const tab of TABS) {
      expect(typeof catalog[tab.labelKey]).toBe('string');
      expect(typeof catalog[tab.accessibilityKey]).toBe('string');
    }
  });

  it('give each tab a distinct icon on each platform', () => {
    expect(new Set(TABS.map((tab) => tab.icon.ios)).size).toBe(TABS.length);
    expect(new Set(TABS.map((tab) => tab.icon.android)).size).toBe(TABS.length);
  });
});
