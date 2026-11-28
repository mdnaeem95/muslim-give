import { Alert as NativeAlert, Pressable } from 'react-native';
import { AppText } from './AppText';
import { touchTarget } from './touch';

/**
 * A button that asks before doing something that cannot be undone, with the platform's own
 * confirmation dialog (spec 6.5). The prototype's "tap again to delete" is too easy to trigger by
 * accident and invisible to screen readers.
 */
export function ConfirmButton({
  label,
  confirmTitle,
  confirmMessage,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
}: {
  readonly label: string;
  readonly confirmTitle: string;
  readonly confirmMessage: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly destructive?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        NativeAlert.alert(confirmTitle, confirmMessage, [
          { text: cancelLabel, style: 'cancel' },
          {
            text: confirmLabel,
            style: destructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ]);
      }}
      style={{ minHeight: touchTarget, justifyContent: 'center' }}
    >
      <AppText weight="semibold" color={destructive ? 'dangerText' : 'primaryText'}>
        {label}
      </AppText>
    </Pressable>
  );
}
