import { ruleWidth } from '@muslim-give/ui-tokens';
import { Pressable, View } from 'react-native';
import type { ChoiceOption } from './choice';
import { AppText } from './AppText';
import { touchTarget } from './touch';
import { useTheme } from './theme';

/**
 * A row of chips where exactly one can be chosen, such as the amount buttons. It is one radio
 * group for screen readers, and each chip says whether it is selected.
 */
export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  readonly options: readonly ChoiceOption<V>[];
  readonly value: V | null;
  readonly onChange: (value: V) => void;
  readonly accessibilityLabel: string;
}): React.JSX.Element {
  const { space } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          accessibilityLabel={option.accessibilityLabel}
          selected={option.value === value}
          onPress={() => {
            onChange(option.value);
          }}
        />
      ))}
    </View>
  );
}

export function Chip({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel?: string | undefined;
  readonly selected: boolean;
  readonly onPress: () => void;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: touchTarget,
        minWidth: touchTarget,
        paddingHorizontal: space.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: ruleWidth,
        borderColor: selected ? colors.primary : colors.line,
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
        {label}
      </AppText>
    </Pressable>
  );
}
