import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from './theme';

/** What a list shows when it has nothing yet: one calm sentence, with an optional heading. */
export function EmptyState({
  message,
  title,
}: {
  readonly message: string;
  readonly title?: string;
}): React.JSX.Element {
  const { space } = useTheme();
  return (
    <View style={{ padding: space.xl, gap: space.xs, alignItems: 'center' }}>
      {title === undefined ? null : (
        <AppText variant="subheading" center>
          {title}
        </AppText>
      )}
      <AppText muted center>
        {message}
      </AppText>
    </View>
  );
}
