import { t } from '../../src/i18n';
import { AppText } from '../../src/ui/AppText';
import { Screen } from '../../src/ui/Screen';

export default function EidScreen(): React.JSX.Element {
  return (
    <Screen>
      <AppText variant="title">{t('tabs.eid.label')}</AppText>
      <AppText muted>{t('placeholder.coming')}</AppText>
    </Screen>
  );
}
