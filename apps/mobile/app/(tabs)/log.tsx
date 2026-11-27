import { t } from '../../src/i18n';
import { AppText } from '../../src/ui/AppText';
import { Screen } from '../../src/ui/Screen';

export default function LogScreen(): React.JSX.Element {
  return (
    <Screen>
      <AppText variant="title">{t('tabs.log.label')}</AppText>
      <AppText muted>{t('placeholder.coming')}</AppText>
    </Screen>
  );
}
