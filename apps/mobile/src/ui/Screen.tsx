import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabErrorBoundary } from './TabErrorBoundary';
import { useTheme } from './theme';

/**
 * The frame every tab screen sits in: background, padding, scrolling and an error boundary.
 * There is no top bar, so the top padding clears the status bar and the notch on both platforms.
 */
export function Screen({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <TabErrorBoundary>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: space.md,
          paddingTop: insets.top + space.md,
          gap: space.sm,
        }}
      >
        {children}
      </ScrollView>
    </TabErrorBoundary>
  );
}
