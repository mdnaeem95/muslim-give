import { ruleWidth } from '@muslim-give/ui-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from './theme';

const ACCENT_WIDTH = 4;

/** A white panel with a 1 px rule and square corners (spec 6.5). */
export function Card({
  children,
  accent = false,
}: {
  readonly children: ReactNode;
  readonly accent?: boolean;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: ruleWidth,
        borderColor: colors.line,
        borderTopWidth: accent ? ACCENT_WIDTH : ruleWidth,
        borderTopColor: accent ? colors.primary : colors.line,
        padding: space.md,
        gap: space.sm,
      }}
    >
      {children}
    </View>
  );
}

/** A card with the green top rule that marks the main panel of a screen. */
export function AccentCard({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return <Card accent>{children}</Card>;
}
