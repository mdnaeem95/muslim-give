import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../src/i18n';
import { AppText } from '../src/ui/AppText';
import { AccentCard, Card } from '../src/ui/Card';
import { Alert } from '../src/ui/Alert';
import { Chip, ChipGroup } from '../src/ui/Chip';
import { EmptyState } from '../src/ui/EmptyState';
import { ListRow } from '../src/ui/ListRow';
import { Screen } from '../src/ui/Screen';
import { Segmented } from '../src/ui/Segmented';
import { Tag } from '../src/ui/Tag';
import { touchTarget } from '../src/ui/touch';

/** Sample figures for looking at the components. They are not real data. */
const AMOUNTS = [
  { value: '5', label: 'S$5', accessibilityLabel: '5 Singapore dollars' },
  { value: '10', label: 'S$10', accessibilityLabel: '10 Singapore dollars' },
  { value: '20', label: 'S$20', accessibilityLabel: '20 Singapore dollars' },
  { value: '50', label: 'S$50', accessibilityLabel: '50 Singapore dollars' },
  { value: '100', label: 'S$100', accessibilityLabel: '100 Singapore dollars' },
] as const;

type Amount = (typeof AMOUNTS)[number]['value'];
type Period = 'week' | 'month' | 'year';

/**
 * A development-only page that shows every shared component, for checking them on a device at
 * the default and the largest text size. Release builds redirect away from it.
 */
export default function GalleryScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState<Amount | null>('10');
  const [period, setPeriod] = useState<Period>('month');
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dev.back')}
        onPress={() => {
          router.back();
        }}
        style={{ minHeight: touchTarget, justifyContent: 'center' }}
      >
        <AppText color="primaryText" weight="semibold">
          {t('dev.back')}
        </AppText>
      </Pressable>

      <AppText variant="heading">{t('dev.card')}</AppText>
      <Card>
        <AppText>{t('dev.longLabel')}</AppText>
      </Card>

      <AppText variant="heading">{t('dev.accentCard')}</AppText>
      <AccentCard>
        <AppText>{t('dev.longLabel')}</AppText>
      </AccentCard>

      <AppText variant="heading">{t('dev.tags')}</AppText>
      <Card>
        <Tag>Zakat</Tag>
        <Tag tone="green">Monthly</Tag>
      </Card>

      <AppText variant="heading">{t('dev.alerts')}</AppText>
      <Alert level="near">{t('dev.nearMessage')}</Alert>
      <Alert level="over">{t('dev.overMessage')}</Alert>
      <Alert level="done">{t('dev.doneMessage')}</Alert>

      <AppText variant="heading">{t('dev.listRows')}</AppText>
      <Card>
        <ListRow
          title="Masjid Sultan"
          subtitle="Zakat · 5 Mar 2027"
          trailing="S$50"
          trailingSpoken="50 Singapore dollars"
        />
        <ListRow
          title={t('dev.longLabel')}
          subtitle="Sadaqah"
          trailing="S$1,250"
          trailingSpoken="1,250 Singapore dollars"
          onPress={() => undefined}
          divider={false}
        />
      </Card>

      <AppText variant="heading">{t('dev.emptyState')}</AppText>
      <Card>
        <EmptyState message={t('dev.empty')} />
      </Card>

      <AppText variant="heading">{t('dev.chips')}</AppText>
      <ChipGroup
        options={AMOUNTS}
        value={amount}
        onChange={setAmount}
        accessibilityLabel={t('dev.amountGroup')}
      />
      <Chip label="S$250" selected={false} onPress={() => undefined} />

      <AppText variant="heading">{t('dev.segmented')}</AppText>
      <Segmented
        options={[
          { value: 'week', label: t('dev.period.week') },
          { value: 'month', label: t('dev.period.month') },
          { value: 'year', label: t('dev.period.year') },
        ]}
        value={period}
        onChange={setPeriod}
        accessibilityLabel={t('dev.periodGroup')}
      />
      {/* This page has no tab bar, so keep the last control clear of the home indicator. */}
      <View style={{ height: insets.bottom }} />
    </Screen>
  );
}
