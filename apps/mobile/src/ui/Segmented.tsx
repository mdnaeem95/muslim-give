import { ruleWidth } from '@muslim-give/ui-tokens';
import { Pressable, View } from 'react-native';
import type { ChoiceOption } from './choice';
import { AppText } from './AppText';
import { touchTarget } from './touch';
import { useTheme } from './theme';

/**
 * Two to four choices side by side, one always selected (such as week, month, year). Each
 * segment is as wide as the others and its label wraps rather than being cut off.
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  readonly options: readonly ChoiceOption<V>[];
  readonly value: V;
  readonly onChange: (value: V) => void;
  readonly accessibilityLabel: string;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', borderWidth: ruleWidth, borderColor: colors.line }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: touchTarget,
              paddingHorizontal: space.xs,
              paddingVertical: space.sm,
              justifyContent: 'center',
              borderLeftWidth: index === 0 ? 0 : ruleWidth,
              borderLeftColor: colors.line,
              backgroundColor: selected
                ? pressed
                  ? colors.primaryDark
                  : colors.primary
                : pressed
                  ? colors.background
                  : colors.surface,
            })}
          >
            <AppText weight="semibold" color={selected ? 'onPrimary' : 'text'} center>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
