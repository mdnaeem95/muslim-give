import { View } from 'react-native';
import { t } from '../i18n';
import { ALERT_STYLES, type AlertLevel } from '../lib/alert';
import { alertLabel } from '../lib/labels';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useTheme } from './theme';

const ACCENT_WIDTH = 4;
const ICON_SIZE = 20;

/**
 * A message about the budget: near, over or done. It is announced by screen readers with its
 * level first, and the icon and the words mean the same as the colour (spec 6.5, 6.6).
 */
export function Alert({
  level,
  children,
}: {
  readonly level: AlertLevel;
  readonly children: string;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  const style = ALERT_STYLES[level];
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={alertLabel(t(style.prefixKey), children)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.xs,
        padding: space.sm,
        backgroundColor: colors[style.background],
        borderLeftWidth: ACCENT_WIDTH,
        borderLeftColor: colors[style.accent],
      }}
    >
      <Icon
        ios={style.icon.ios}
        android={style.icon.android}
        color={colors[style.text]}
        size={ICON_SIZE}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={style.text}>
          {children}
        </AppText>
      </View>
    </View>
  );
}
