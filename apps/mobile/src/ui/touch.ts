import { minTouchTarget } from '@muslim-give/ui-tokens';
import { Platform } from 'react-native';

/** Spec 6.6: at least 44 pt on iOS and 48 dp on Android. */
export const touchTarget: number =
  Platform.OS === 'ios' ? minTouchTarget.ios : minTouchTarget.android;
