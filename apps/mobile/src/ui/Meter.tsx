import type { MeterLevel } from '@muslim-give/ui-tokens';
import { View } from 'react-native';
import { t } from '../i18n';
import { meterModel, METER_ICONS } from '../lib/meter';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useTheme } from './theme';

const BAR_HEIGHT = 10;
const ICON_SIZE = 18;

/**
 * The budget meter (R-BUD-03): ok and done are green, near is amber, over shows the budget share
 * green and the excess red. The percentage and an icon are always shown beside the bar, so colour
 * is never the only signal (spec 6.5). It is a progress bar for screen readers and does not animate.
 */
export function Meter({
  level,
  usedPercent,
  greenPercent,
  redPercent,
}: {
  readonly level: MeterLevel;
  readonly usedPercent: number;
  readonly greenPercent: number;
  readonly redPercent: number;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  const model = meterModel(level, usedPercent, greenPercent, redPercent);
  const icon = model.colors.icon === 'none' ? null : METER_ICONS[model.colors.icon];
  const percentText =
    model.percentUsed === null ? null : t('meter.percent', { percent: model.percentUsed });
  const label = t(model.labelKey);
  const spoken = percentText === null ? label : `${label}. ${percentText}`;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={spoken}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(model.greenWidth + model.redWidth) }}
      style={{ gap: space.xs }}
    >
      <View style={{ flexDirection: 'row', height: BAR_HEIGHT, backgroundColor: colors.line }}>
        <View style={{ flex: model.greenWidth, backgroundColor: colors[model.colors.fill] }} />
        <View style={{ flex: model.redWidth, backgroundColor: colors.danger }} />
        <View style={{ flex: 100 - model.greenWidth - model.redWidth }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        {icon === null ? null : (
          <Icon name={icon} color={colors[model.colors.text]} size={ICON_SIZE} />
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="caption" weight="semibold" color={model.colors.text}>
            {percentText === null ? label : `${label} · ${percentText}`}
          </AppText>
        </View>
      </View>
    </View>
  );
}
