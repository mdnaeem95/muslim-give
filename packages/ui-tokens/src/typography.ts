/** Spec 6.5: Noto Sans (400/500/600/700), bundled with the app and scaled with the OS text size. */
export const fontSize = {
  /** The big amount on the Budget card (prototype .big). */
  display: 40,
  title: 26,
  heading: 20,
  subheading: 17,
  body: 15,
  caption: 13,
  small: 12,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** One family name per weight, as loaded by the font loader on both platforms. */
export const fontFamily = {
  regular: 'NotoSans-Regular',
  medium: 'NotoSans-Medium',
  semibold: 'NotoSans-SemiBold',
  bold: 'NotoSans-Bold',
} as const;

/** Prototype body line height. */
export const lineHeightRatio = 1.45;

/** Dynamic type: amounts must stay readable up to 200% (spec 6.6). */
export const MAX_FONT_SCALE = 2;
