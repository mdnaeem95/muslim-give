import { View } from 'react-native';
import { t } from '../i18n';
import { chartModel, type ChartRow } from '../lib/chart';
import { joinLabel } from '../lib/labels';
import { AppText } from './AppText';
import { ChartFrame } from './ChartFrame';
import { useTheme } from './theme';

const PLOT_HEIGHT = 150;

/**
 * Columns side by side, such as the twelve months of a year, with one highlighted (the current
 * month). The whole plot is one element for screen readers, which read every column in turn;
 * "View as list" gives the same figures as rows.
 */
export function ColumnChart({
  rows,
  highlightIndex = null,
}: {
  readonly rows: readonly ChartRow[];
  readonly highlightIndex?: number | null;
}): React.JSX.Element {
  const { colors, space } = useTheme();
  const model = chartModel(rows);
  const spoken = model.rows
    .map((row) =>
      joinLabel([
        row.label,
        row.spokenValue ?? row.valueLabel,
        t('chart.share', { percent: row.sharePercent }),
      ]),
    )
    .join('. ');
  return (
    <ChartFrame rows={rows}>
      <View accessible accessibilityLabel={spoken} style={{ gap: space.xxs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: space.xxs,
            height: PLOT_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          {model.rows.map((row, index) => (
            <View key={row.label} style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
              <View
                style={{
                  height: Math.max(1, row.fraction * PLOT_HEIGHT),
                  backgroundColor: index === highlightIndex ? colors.textSecondary : colors.primary,
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.xxs }}>
          {model.rows.map((row) => (
            <View key={row.label} style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="small" muted>
                {row.shortLabel ?? row.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </ChartFrame>
  );
}
