import { useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { t } from '../i18n';
import { chartModel, type ChartRow } from '../lib/chart';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { ListRow } from './ListRow';
import { touchTarget } from './touch';

/**
 * Wraps a chart with "View as list" (spec 6.6): the same figures as plain rows, for anyone who
 * cannot read a picture of them. Every row shows its share of the total in words.
 */
export function ChartFrame({
  rows,
  children,
}: {
  readonly rows: readonly ChartRow[];
  readonly children: ReactNode;
}): React.JSX.Element {
  const [asList, setAsList] = useState(false);
  if (rows.length === 0) return <EmptyState message={t('chart.empty')} />;
  const model = chartModel(rows);
  return (
    <>
      {asList
        ? model.rows.map((row, index) => (
            <ListRow
              key={row.label}
              title={row.label}
              subtitle={t('chart.share', { percent: row.sharePercent })}
              trailing={row.valueLabel}
              trailingSpoken={row.spokenValue}
              divider={index < model.rows.length - 1}
            />
          ))
        : children}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={asList ? t('chart.viewAsChart') : t('chart.viewAsList')}
        onPress={() => {
          setAsList((current) => !current);
        }}
        style={{ minHeight: touchTarget, justifyContent: 'center' }}
      >
        <AppText color="primaryText" weight="semibold">
          {asList ? t('chart.viewAsChart') : t('chart.viewAsList')}
        </AppText>
      </Pressable>
    </>
  );
}
