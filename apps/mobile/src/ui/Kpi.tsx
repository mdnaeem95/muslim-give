import { View } from 'react-native';
import { joinLabel } from '../lib/labels';
import { AppText } from './AppText';
import { Card } from './Card';

/**
 * A headline figure: a small label, a large value and an optional line beneath. `good` colours the
 * value green and `over` red (a pairing the contrast test checks); the words say the same thing.
 */
export function Kpi({
  label,
  value,
  valueSpoken,
  sub,
  tone = 'default',
}: {
  readonly label: string;
  readonly value: string;
  /** What a screen reader says for `value`, e.g. "1,250 Singapore dollars" for "S$1,250". */
  readonly valueSpoken?: string | undefined;
  readonly sub?: string | undefined;
  readonly tone?: 'default' | 'good' | 'over';
}): React.JSX.Element {
  return (
    <Card>
      <View accessible accessibilityLabel={joinLabel([label, valueSpoken ?? value, sub])}>
        <AppText variant="small" weight="semibold" muted>
          {label}
        </AppText>
        <AppText
          variant="title"
          color={tone === 'good' ? 'primaryText' : tone === 'over' ? 'dangerText' : 'text'}
        >
          {value}
        </AppText>
        {sub === undefined ? null : (
          <AppText variant="caption" muted>
            {sub}
          </AppText>
        )}
      </View>
    </Card>
  );
}
