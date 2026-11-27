import { Tabs } from 'expo-router';
import { t } from '../../src/i18n';
import { useTheme } from '../../src/ui/theme';

/**
 * The five tabs in the order of spec 6.4. Labels are short; the full names are the accessibility
 * labels. This is the JavaScript tab bar for now; the native tab bar replaces it when its
 * Expo Router API is stable (see ADR 012).
 */
export default function TabsLayout(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard.label'),
          tabBarAccessibilityLabel: t('tabs.dashboard.accessibility'),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: t('tabs.log.label'),
          tabBarAccessibilityLabel: t('tabs.log.accessibility'),
        }}
      />
      <Tabs.Screen
        name="eid"
        options={{
          title: t('tabs.eid.label'),
          tabBarAccessibilityLabel: t('tabs.eid.accessibility'),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: t('tabs.budget.label'),
          tabBarAccessibilityLabel: t('tabs.budget.accessibility'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile.label'),
          tabBarAccessibilityLabel: t('tabs.profile.accessibility'),
        }}
      />
    </Tabs>
  );
}
