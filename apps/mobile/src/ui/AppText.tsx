import { Text } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from './theme';

type Variant = 'title' | 'heading' | 'body' | 'caption';

/** Text that follows the system text size up to 200% (spec 6.6). */
export function AppText({
  variant = 'body',
  muted = false,
  children,
}: {
  readonly variant?: Variant;
  readonly muted?: boolean;
  readonly children: ReactNode;
}): React.JSX.Element {
  const { colors, fontSize, fontWeight, maxFontScale } = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : 'text'}
      maxFontSizeMultiplier={maxFontScale}
      style={{
        color: muted ? colors.textMuted : colors.text,
        fontSize: fontSize[variant],
        fontWeight: isHeading ? fontWeight.bold : fontWeight.regular,
      }}
    >
      {children}
    </Text>
  );
}
