import type { Palette } from '@muslim-give/ui-tokens';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from './theme';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'small';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * Text that follows the system text size up to 200% (spec 6.6). `color` is a palette name and
 * overrides `muted`; both must be a pairing listed in the contrast test.
 */
export function AppText({
  variant = 'body',
  muted = false,
  color,
  weight,
  center = false,
  children,
}: {
  readonly variant?: Variant;
  readonly muted?: boolean;
  readonly color?: keyof Palette;
  readonly weight?: Weight;
  readonly center?: boolean;
  readonly children: ReactNode;
}): React.JSX.Element {
  const { colors, fontSize, fontWeight, maxFontScale } = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  const fallbackColor = muted ? colors.textMuted : colors.text;
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : 'text'}
      maxFontSizeMultiplier={maxFontScale}
      style={{
        color: color === undefined ? fallbackColor : colors[color],
        fontSize: fontSize[variant],
        fontWeight: fontWeight[weight ?? (isHeading ? 'bold' : 'regular')],
        textAlign: center ? 'center' : 'auto',
      }}
    >
      {children}
    </Text>
  );
}
