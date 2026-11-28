import { countryListSections, currencyName, findCountry, type Country } from '@muslim-give/domain';
import { ruleWidth } from '@muslim-give/ui-tokens';
import { useState } from 'react';
import { Modal, Pressable, SectionList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { Icon } from './Icon';
import { touchTarget } from './touch';
import { useTheme } from './theme';

const ICON_SIZE = 18;

/** The shape `SectionList` wants: the list's own section id, with its countries as `data`. */
interface PickerSection {
  readonly id: CountryListSectionId;
  readonly data: readonly Country[];
}

/**
 * A country field that opens a searchable list (spec 6.5, 10.1). With nothing typed the list shows
 * the Common group, then every other country; typing narrows it, names starting with the text
 * first and accents ignored. `excludeCode` hides the home country (R-CTY-04). The sheet closes on
 * a choice, on "Close" and on the Android back button.
 */
export function CountryPicker({
  label,
  value,
  onChange,
  excludeCode,
  error,
}: {
  readonly label: string;
  /** ISO 3166-1 code of the chosen country, or null when none is chosen yet. */
  readonly value: string | null;
  readonly onChange: (code: string) => void;
  readonly excludeCode?: string | undefined;
  readonly error?: string | undefined;
}): React.JSX.Element {
  const { colors, space, fontSize, maxFontScale } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chosen = value === null ? null : findCountry(value);
  const sections = countryListSections(query, excludeCode).map(
    (section): PickerSection => ({ id: section.id, data: section.countries }),
  );
  const close = (): void => {
    setOpen(false);
    setQuery('');
  };
  const sectionTitle = { common: t('country.section.common'), all: t('country.section.all') };
  return (
    <View style={{ gap: space.xxs }}>
      <AppText variant="caption" color="textSecondary" weight="semibold">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${chosen === null ? t('country.none') : chosen.name}`}
        accessibilityHint={t('country.hint')}
        onPress={() => {
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: touchTarget,
          gap: space.xs,
          paddingHorizontal: space.sm,
          borderWidth: ruleWidth,
          borderColor: error === undefined ? colors.line : colors.danger,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" muted={chosen === null}>
            {chosen === null ? t('country.none') : chosen.name}
          </AppText>
        </View>
        <Icon
          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down' }}
          color={colors.textSecondary}
          size={ICON_SIZE}
        />
      </Pressable>
      {error === undefined ? null : (
        <AppText variant="caption" color="dangerText">
          {error}
        </AppText>
      )}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <SafeAreaView
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.sm,
              paddingHorizontal: space.md,
              paddingTop: space.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t('country.title')}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('country.close')}
              onPress={close}
              style={{ minHeight: touchTarget, justifyContent: 'center' }}
            >
              <AppText color="primaryText" weight="semibold">
                {t('country.close')}
              </AppText>
            </Pressable>
          </View>
          <View style={{ padding: space.md }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('country.search')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('country.search')}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              maxFontSizeMultiplier={maxFontScale}
              style={{
                minHeight: touchTarget,
                paddingHorizontal: space.sm,
                borderWidth: ruleWidth,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                color: colors.text,
                fontSize: fontSize.body,
              }}
            />
          </View>
          <SectionList<Country, PickerSection>
            sections={sections}
            keyExtractor={(country: Country) => country.code}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: space.xl }}
            ListEmptyComponent={<EmptyState message={t('country.noMatch', { query })} />}
            renderSectionHeader={({ section }) =>
              section.id === 'results' ? null : (
                <View style={{ paddingTop: space.sm, backgroundColor: colors.background }}>
                  <AppText variant="small" color="textSecondary" weight="bold">
                    {sectionTitle[section.id]}
                  </AppText>
                </View>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${currencyName(item.currency)}`}
                accessibilityState={{ selected: item.code === value }}
                onPress={() => {
                  onChange(item.code);
                  close();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  minHeight: touchTarget,
                  paddingVertical: space.xs,
                  borderBottomWidth: ruleWidth,
                  borderBottomColor: colors.line,
                  backgroundColor: pressed ? colors.surface : 'transparent',
                })}
              >
                <View style={{ flex: 1 }}>
                  <AppText weight={item.code === value ? 'bold' : 'regular'}>{item.name}</AppText>
                </View>
                <AppText variant="caption" muted>
                  {item.currency}
                </AppText>
                {item.code === value ? (
                  <Icon
                    name={{ ios: 'checkmark', android: 'check' }}
                    color={colors.primaryText}
                    size={ICON_SIZE}
                  />
                ) : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
