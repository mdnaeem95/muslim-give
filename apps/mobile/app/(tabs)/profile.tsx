import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { t } from '../../src/i18n';
import { AppText } from '../../src/ui/AppText';
import { Screen } from '../../src/ui/Screen';
import { touchTarget } from '../../src/ui/touch';

export default function ProfileScreen(): React.JSX.Element {
  return (
    <Screen>
      <AppText variant="title">{t('tabs.profile.label')}</AppText>
      <AppText muted>{t('placeholder.coming')}</AppText>
      {__DEV__ ? (
        <Link href="/gallery" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('dev.gallery')}
            style={{ minHeight: touchTarget, justifyContent: 'center' }}
          >
            <AppText color="primaryText" weight="semibold">
              {t('dev.gallery')}
            </AppText>
          </Pressable>
        </Link>
      ) : null}
    </Screen>
  );
}
