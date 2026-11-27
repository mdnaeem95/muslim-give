import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { TabErrorBoundary } from './TabErrorBoundary';
import { useTheme } from './theme';

/** The frame every tab screen sits in: background, padding, scrolling and an error boundary. */
export function Screen({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { colors, space } = useTheme();
  return (
    <TabErrorBoundary>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: space.md, gap: space.sm }}
      >
        {children}
      </ScrollView>
    </TabErrorBoundary>
  );
}
