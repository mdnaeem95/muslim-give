import { View } from 'react-native';
import { t } from '../i18n';
import { chartModel, type ChartRow } from '../lib/chart';
import { joinLabel } from '../lib/labels';
import { AppText } from './AppText';
import { ChartFrame } from './ChartFrame';
import { useTheme } from './theme';

const TRACK_HEIGHT = 14;

/**
 * Horizontal bars, one per row, such as the top mosques. Each row says its label and value above
 * its bar, so long labels wrap and large text never squeezes the bar. Each row is read aloud as
 * "Mosque, 320 Singapore dollars, 40% of the total".
 */
export function BarChart({ rows }: { readonly rows: readonly ChartRow[] }): React.JSX.Element {
  const { colors, space } = useTheme();
  const model = chartModel(rows);
  return (
    <ChartFrame rows={rows}>
      {model.rows.map((row) => (
        <View
          key={row.label}
          accessible
          accessibilityLabel={joinLabel([
            row.label,
            row.spokenValue ?? row.valueLabel,
            t('chart.share', { percent: row.sharePercent }),
          ])}
          style={{ gap: space.xxs }}
        >
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption">{row.label}</AppText>
            </View>
            <View style={{ flexShrink: 0 }}>
              <AppText variant="caption" weight="semibold">
                {row.valueLabel}
              </AppText>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              height: TRACK_HEIGHT,
              backgroundColor: colors.background,
            }}
          >
            <View style={{ flex: row.fraction * 100, backgroundColor: colors.primary }} />
            <View style={{ flex: 100 - row.fraction * 100 }} />
          </View>
        </View>
      ))}
    </ChartFrame>
  );
}
