import { ruleWidth } from '@muslim-give/ui-tokens';
import { Pressable, View } from 'react-native';
import { joinLabel } from '../lib/labels';
import { AppText } from './AppText';
import { touchTarget } from './touch';
import { useTheme } from './theme';

/**
 * One line of a list: a title, an optional second line and an optional amount on the right. Long
 * text wraps and the amount never shrinks, so nothing is truncated at 200% text (spec 6.6). With
 * `onPress` the whole row is one button of at least the minimum touch size.
 */
export function ListRow({
  title,
  subtitle,
  trailing,
  trailingSpoken,
  onPress,
  divider = true,
}: {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly trailing?: string | undefined;
  /** What a screen reader says for `trailing`, e.g. "50 Singapore dollars" for "S$50". */
  readonly trailingSpoken?: string | undefined;
  readonly onPress?: (() => void) | undefined;
  /** The 1 px rule under the row. Turn it off for the last row inside a card. */
  readonly divider?: boolean | undefined;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  const content = (
    <>
      <View style={{ flex: 1, gap: space.xxs / 2 }}>
        <AppText weight="semibold">{title}</AppText>
        {subtitle === undefined ? null : (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        )}
      </View>
      {trailing === undefined ? null : (
        <View style={{ flexShrink: 0 }}>
          <AppText weight="bold">{trailing}</AppText>
        </View>
      )}
    </>
  );
  const frame = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: divider ? ruleWidth : 0,
    borderBottomColor: colors.line,
  } as const;
  const label = joinLabel([title, subtitle, trailingSpoken ?? trailing]);
  if (onPress === undefined) {
    return (
      <View accessible accessibilityLabel={label} style={frame}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        frame,
        { minHeight: touchTarget, backgroundColor: pressed ? colors.background : 'transparent' },
      ]}
    >
      {content}
    </Pressable>
  );
}
