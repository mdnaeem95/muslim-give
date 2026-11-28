import { currencyName } from '@muslim-give/domain';
import { ruleWidth } from '@muslim-give/ui-tokens';
import { TextInput, View } from 'react-native';
import { t } from '../i18n';
import { currencyPrefix, sanitizeAmount } from '../lib/amount-input';
import { AppText } from './AppText';
import { touchTarget } from './touch';
import { useTheme } from './theme';

/**
 * An amount box with its currency in front (spec 6.5). What is typed is cleaned as it is typed
 * (`sanitizeAmount`), so the parent only ever holds text the money parser accepts. The prefix sits
 * beside the text in a row, so it needs no measuring (the prototype's `fixMoney` did that by hand).
 * Screen readers say "Amount in Singapore dollars" and skip the symbol; `error` is read as a hint.
 */
export function MoneyInput({
  label,
  value,
  onChangeText,
  currency,
  error,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  /** ISO 4217 code. It decides the prefix and how many decimals can be typed. */
  readonly currency: string;
  readonly error?: string | undefined;
}): React.JSX.Element {
  const { colors, space, fontSize, fontWeight, maxFontScale } = useTheme();
  return (
    <View style={{ gap: space.xxs }}>
      <AppText variant="caption" color="textSecondary" weight="semibold">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: touchTarget,
          gap: space.xs,
          paddingHorizontal: space.sm,
          borderWidth: ruleWidth,
          borderColor: error === undefined ? colors.line : colors.danger,
          backgroundColor: colors.surface,
        }}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppText weight="bold" color="textSecondary">
            {currencyPrefix(currency)}
          </AppText>
        </View>
        <TextInput
          value={value}
          onChangeText={(text) => {
            onChangeText(sanitizeAmount(text, currency));
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('money.amountLabel', { currency: currencyName(currency) })}
          accessibilityHint={error}
          maxFontSizeMultiplier={maxFontScale}
          style={{
            flex: 1,
            paddingVertical: space.xs,
            color: colors.text,
            fontSize: fontSize.body,
            fontWeight: fontWeight.semibold,
          }}
        />
      </View>
      {error === undefined ? null : (
        <AppText variant="caption" color="dangerText">
          {error}
        </AppText>
      )}
    </View>
  );
}
