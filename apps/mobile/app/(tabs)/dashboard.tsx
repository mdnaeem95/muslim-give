import { toHijri } from '@muslim-give/domain';
import { useToday } from '../../src/clock/ClockProvider';
import { t } from '../../src/i18n';
import { formatCivilDate, formatHijriDate } from '../../src/lib/format';
import { AppText } from '../../src/ui/AppText';
import { Screen } from '../../src/ui/Screen';

export default function DashboardScreen(): React.JSX.Element {
  const today = useToday();
  // Rule R-HIJ-06: outside the table there is no Hijri date, never a wrong one.
  const hijri = toHijri(today, 0);
  return (
    <Screen>
      <AppText variant="title">{t('dashboard.today')}</AppText>
      <AppText>{formatCivilDate(today)}</AppText>
      {hijri === null ? null : <AppText>{formatHijriDate(hijri)}</AppText>}
      <AppText muted>{t('placeholder.coming')}</AppText>
    </Screen>
  );
}
