import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { t } from '../../src/i18n';
import { TABS } from '../../src/lib/tabs';
import { useTheme } from '../../src/ui/theme';

const ICON_SIZE = 24;

/**
 * The five tabs in the order of spec 6.4. Labels are short; the full names are the accessibility
 * labels. There is no top bar: each screen shows its own heading, which scales with the system
 * text size, where a fixed-height bar would clip it (spec 6.6). This is the JavaScript tab bar for
 * now; the native tab bar replaces it when its Expo Router API is confirmed stable (see ADR 012).
 */
export default function TabsLayout(): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarAccessibilityLabel: t(tab.accessibilityKey),
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: tab.icon.ios, android: tab.icon.android }}
                tintColor={color}
                size={ICON_SIZE}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
