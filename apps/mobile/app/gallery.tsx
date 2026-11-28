import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../src/i18n';
import { AppText } from '../src/ui/AppText';
import { AccentCard, Card } from '../src/ui/Card';
import { Alert } from '../src/ui/Alert';
import { BarChart } from '../src/ui/BarChart';
import { Chip, ChipGroup } from '../src/ui/Chip';
import { ColumnChart } from '../src/ui/ColumnChart';
import { ConfirmButton } from '../src/ui/ConfirmButton';
import { EmptyState } from '../src/ui/EmptyState';
import { Kpi } from '../src/ui/Kpi';
import { ListRow } from '../src/ui/ListRow';
import { Meter } from '../src/ui/Meter';
import { Screen } from '../src/ui/Screen';
import { Segmented } from '../src/ui/Segmented';
import { Tag } from '../src/ui/Tag';
import { useToast } from '../src/ui/Toast';
import { touchTarget } from '../src/ui/touch';

/** Sample figures for looking at the components. They are not real data. */
const AMOUNTS = [
  { value: '5', label: 'S$5', accessibilityLabel: '5 Singapore dollars' },
  { value: '10', label: 'S$10', accessibilityLabel: '10 Singapore dollars' },
  { value: '20', label: 'S$20', accessibilityLabel: '20 Singapore dollars' },
  { value: '50', label: 'S$50', accessibilityLabel: '50 Singapore dollars' },
  { value: '100', label: 'S$100', accessibilityLabel: '100 Singapore dollars' },
] as const;

const MONTHS = [
  { label: 'January', short: 'J', value: 320 },
  { label: 'February', short: 'F', value: 180 },
  { label: 'March', short: 'M', value: 450 },
  { label: 'April', short: 'A', value: 90 },
  { label: 'May', short: 'M', value: 0 },
  { label: 'June', short: 'J', value: 275 },
  { label: 'July', short: 'J', value: 60 },
  { label: 'August', short: 'A', value: 500 },
  { label: 'September', short: 'S', value: 210 },
  { label: 'October', short: 'O', value: 130 },
  { label: 'November', short: 'N', value: 380 },
  { label: 'December', short: 'D', value: 40 },
] as const;

const MONTH_ROWS = MONTHS.map((month) => ({
  label: month.label,
  shortLabel: month.short,
  value: month.value,
  valueLabel: `S$${String(month.value)}`,
  spokenValue: `${String(month.value)} Singapore dollars`,
}));

const RECIPIENT_ROWS = [
  { label: 'Masjid Sultan', value: 320 },
  { label: 'A very long organisation name that has to wrap onto a second line', value: 160 },
  { label: 'Pertapis', value: 80 },
].map((row) => ({
  ...row,
  valueLabel: `S$${String(row.value)}`,
  spokenValue: `${String(row.value)} Singapore dollars`,
}));

type Amount = (typeof AMOUNTS)[number]['value'];
type Period = 'week' | 'month' | 'year';

/**
 * A development-only page that shows every shared component, for checking them on a device at
 * the default and the largest text size. Release builds redirect away from it.
 */
export default function GalleryScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
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
      <AppText variant="heading">{t('dev.kpis')}</AppText>
      <Kpi
        label={t('dev.kpi.total')}
        value="S$1,250"
        valueSpoken="1,250 Singapore dollars"
        sub={t('dev.kpi.yearly')}
        tone="good"
      />
      <Kpi
        label={t('dev.kpi.total')}
        value="S$3,100"
        valueSpoken="3,100 Singapore dollars"
        sub={t('dev.kpi.yearly')}
        tone="over"
      />

      <AppText variant="heading">{t('dev.meters')}</AppText>
      <Card>
        <Meter level="none" usedPercent={0} greenPercent={0} redPercent={0} />
        <Meter level="ok" usedPercent={40} greenPercent={40} redPercent={0} />
        <Meter level="near" usedPercent={85} greenPercent={85} redPercent={0} />
        <Meter level="done" usedPercent={100} greenPercent={100} redPercent={0} />
        <Meter level="over" usedPercent={125} greenPercent={80} redPercent={20} />
      </Card>

      <AppText variant="heading">{t('dev.toasts')}</AppText>
      <ChipGroup
        options={[
          { value: 'default', label: t('dev.toast.default') },
          { value: 'near', label: t('dev.toast.near') },
          { value: 'over', label: t('dev.toast.over') },
        ]}
        value={null}
        onChange={(tone) => {
          toast(
            t(
              tone === 'default'
                ? 'dev.toast.message'
                : tone === 'near'
                  ? 'dev.toast.nearMessage'
                  : 'dev.toast.overMessage',
            ),
            tone,
          );
        }}
        accessibilityLabel={t('dev.toasts')}
      />

      <AppText variant="heading">{t('dev.confirm')}</AppText>
      <ConfirmButton
        label={t('dev.confirm.label')}
        confirmTitle={t('dev.confirm.title')}
        confirmMessage={t('dev.confirm.message')}
        confirmLabel={t('dev.confirm.yes')}
        cancelLabel={t('dev.confirm.no')}
        onConfirm={() => {
          toast(t('dev.confirm.done'));
        }}
      />

      <AppText variant="heading">{t('dev.barChart')}</AppText>
      <Card>
        <BarChart rows={RECIPIENT_ROWS} />
      </Card>

      <AppText variant="heading">{t('dev.columnChart')}</AppText>
      <Card>
        <ColumnChart rows={MONTH_ROWS} highlightIndex={10} />
      </Card>

      {/* This page has no tab bar, so keep the last control clear of the home indicator. */}
      <View style={{ height: insets.bottom }} />
    </Screen>
  );
}
