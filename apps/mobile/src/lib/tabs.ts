/**
 * The five tabs in the order of spec 6.4: route name, copy keys and one icon per platform.
 * iOS uses SF Symbols and Android uses Material Symbols, so each platform shows its own set.
 */
export interface TabDefinition {
  readonly name: string;
  readonly labelKey: string;
  readonly accessibilityKey: string;
  readonly icon: { readonly ios: string; readonly android: string };
}

export const TABS = [
  {
    name: 'dashboard',
    labelKey: 'tabs.dashboard.label',
    accessibilityKey: 'tabs.dashboard.accessibility',
    icon: { ios: 'house', android: 'home' },
  },
  {
    name: 'log',
    labelKey: 'tabs.log.label',
    accessibilityKey: 'tabs.log.accessibility',
    icon: { ios: 'plus.circle', android: 'add_circle' },
  },
  {
    name: 'eid',
    labelKey: 'tabs.eid.label',
    accessibilityKey: 'tabs.eid.accessibility',
    icon: { ios: 'moon.stars', android: 'nights_stay' },
  },
  {
    name: 'budget',
    labelKey: 'tabs.budget.label',
    accessibilityKey: 'tabs.budget.accessibility',
    icon: { ios: 'chart.pie', android: 'pie_chart' },
  },
  {
    name: 'profile',
    labelKey: 'tabs.profile.label',
    accessibilityKey: 'tabs.profile.accessibility',
    icon: { ios: 'person.crop.circle', android: 'account_circle' },
  },
] as const satisfies readonly TabDefinition[];
