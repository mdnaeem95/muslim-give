import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from './theme';

/** A small label such as "Zakat" or "Monthly". `green` marks things the app added or tracks. */
export function Tag({
  tone = 'neutral',
  children,
}: {
  readonly tone?: 'neutral' | 'green';
  readonly children: ReactNode;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  const green = tone === 'green';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: green ? colors.primaryTint : colors.background,
        paddingHorizontal: space.xs,
        paddingVertical: space.xxs / 2,
      }}
    >
      <AppText variant="small" weight="semibold" color={green ? 'primaryText' : 'textSecondary'}>
        {children}
      </AppText>
    </View>
  );
}
