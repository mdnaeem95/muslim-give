import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabErrorBoundary } from './TabErrorBoundary';
import { useTheme } from './theme';

/**
 * The frame every tab screen sits in: background, padding, scrolling and an error boundary.
 * There is no top bar, so the top padding clears the status bar and the notch on both platforms,
 * and a solid strip over the status bar stops scrolled content showing through the clock.
 */
export function Screen({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <TabErrorBoundary>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{
            padding: space.md,
            paddingTop: insets.top + space.md,
            gap: space.sm,
          }}
        >
          {children}
        </ScrollView>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: colors.background,
          }}
        />
      </View>
    </TabErrorBoundary>
  );
}
