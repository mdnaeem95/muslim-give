import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toastDurationMs, TOAST_STYLES, type ToastTone } from '../lib/toast';
import { AppText } from './AppText';
import { useTheme } from './theme';

interface ToastState {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

type Show = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<Show | null>(null);

/**
 * Shows one toast at a time, at the top below the status bar so it never covers the tab bar or the
 * keyboard. It is announced to screen readers when it appears (spec 6.6), stays long enough to be
 * read, and can be dismissed by tapping it. A newer toast replaces an older one. Screens must also
 * show the result in context, because a toast alone is easy to miss.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  const show = useCallback<Show>((message, tone = 'default') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    // Android reads the live region below; iOS needs an explicit announcement.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = setTimeout(() => {
      setToast(null);
    }, toastDurationMs(toast.message));
    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  const style = toast === null ? null : TOAST_STYLES[toast.tone];
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast === null || style === null ? null : (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + space.xs,
            left: space.md,
            right: space.md,
          }}
        >
          <Pressable
            key={toast.id}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={toast.message}
            onPress={() => {
              setToast(null);
            }}
            style={{ backgroundColor: colors[style.background], padding: space.sm }}
          >
            <AppText weight="semibold" color={style.text}>
              {toast.message}
            </AppText>
          </Pressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): Show {
  const show = useContext(ToastContext);
  if (show === null) throw new Error('toast.missing_provider');
  return show;
}
